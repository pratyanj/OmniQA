import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app import models, schemas

router = APIRouter(tags=["Replay"])


def _serialize_run(r: models.ReplayRun) -> dict:
    return {
        "id": r.id,
        "recording_id": r.recording_id,
        "status": r.status,
        "started_at": r.started_at,
        "completed_at": r.completed_at,
        "log": r.log,
        "screenshot_path": r.screenshot_path,
        "step_failed": r.step_failed,
        "triggered_by": r.triggered_by,
        "created_at": r.created_at,
    }


import os
import sys
import subprocess
import tempfile


def _execute_replay(run_id: str, recording_id: str, headed: bool = False, language: str = "python"):
    """
    Background task: runs the Playwright script.
    In development it runs locally via the current Python environment.
    Supports headed (visual Chromium) vs headless mode.
    """
    # Import inside thread to avoid DB session issues
    from app.database import SessionLocal
    db = SessionLocal()

    try:
        run = db.query(models.ReplayRun).filter(models.ReplayRun.id == run_id).first()
        if not run:
            return

        run.status = "running"
        run.started_at = datetime.utcnow()
        db.commit()

        recording = db.query(models.BugRecording).filter(
            models.BugRecording.id == recording_id
        ).first()

        if not recording or not recording.generated_script_py:
            run.status = "error"
            run.log = "No Playwright script available for this recording."
            run.completed_at = datetime.utcnow()
            db.commit()
            return

        script_content = recording.generated_script_py or ""

        # Configure headed / headless
        if headed:
            script_content = script_content.replace("headless=True", "headless=False")
            if ".launch(" in script_content and "headless=" not in script_content:
                script_content = script_content.replace(".launch(", ".launch(headless=False, ")
        else:
            script_content = script_content.replace("headless=False", "headless=True")

        # Write script to temp file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False, encoding="utf-8"
        ) as tmp:
            tmp.write(script_content)
            tmp_path = tmp.name

        python_bin = sys.executable or "python"

        try:
            result = subprocess.run(
                [python_bin, tmp_path],
                capture_output=True,
                text=True,
                timeout=120,
            )
            log_output = (result.stdout or "") + (result.stderr or "")
            if result.returncode == 0:
                run.status = "passed"
                run.log = (
                    "=========================================\n"
                    "  PLAYWRIGHT AUTOMATION RUN: PASSED\n"
                    "=========================================\n\n"
                    + log_output
                )[:50000]
            else:
                run.status = "failed"
                for line in (result.stderr or "").splitlines():
                    if "Error" in line or "failed" in line.lower() or "AssertionError" in line:
                        run.step_failed = line[:255]
                        break
                run.log = (
                    "=========================================\n"
                    "  PLAYWRIGHT AUTOMATION RUN: FAILED\n"
                    "=========================================\n\n"
                    + log_output
                )[:50000]
        except subprocess.TimeoutExpired:
            run.status = "error"
            run.log = "Replay timed out after 120 seconds."
        except FileNotFoundError:
            run.status = "error"
            run.log = f"Python/Playwright interpreter '{python_bin}' not found. Ensure playwright is installed."
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        run.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        try:
            run = db.query(models.ReplayRun).filter(models.ReplayRun.id == run_id).first()
            if run:
                run.status = "error"
                run.log = str(e)
                run.completed_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ─── Trigger Replay ───────────────────────────────────────────────────────────

@router.post("/replay/{recording_id}", response_model=schemas.ReplayRunResponse, status_code=status.HTTP_201_CREATED)
def trigger_replay(
    recording_id: str,
    background_tasks: BackgroundTasks,
    payload: schemas.ReplayTriggerRequest = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(
        models.BugRecording.id == recording_id
    ).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    headed = payload.headed if payload else False
    language = payload.language if payload else "python"

    run = models.ReplayRun(
        id=str(uuid.uuid4()),
        recording_id=recording_id,
        status="pending",
        triggered_by=current_user.id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Fire-and-forget background execution
    background_tasks.add_task(_execute_replay, run.id, recording_id, headed, language)

    return _serialize_run(run)



# ─── Get Run Status ───────────────────────────────────────────────────────────

@router.get("/replay/runs/{run_id}", response_model=schemas.ReplayRunResponse)
def get_replay_run(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    run = db.query(models.ReplayRun).filter(models.ReplayRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Replay run not found")
    return _serialize_run(run)


# ─── List Runs for Recording ──────────────────────────────────────────────────

@router.get("/recordings/{recording_id}/runs", response_model=List[schemas.ReplayRunResponse])
def list_replay_runs(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    runs = db.query(models.ReplayRun).filter(
        models.ReplayRun.recording_id == recording_id
    ).order_by(models.ReplayRun.created_at.desc()).all()
    return [_serialize_run(r) for r in runs]

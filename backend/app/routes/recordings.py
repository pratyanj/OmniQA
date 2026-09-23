import uuid
import os
import shutil
import sys
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import PlainTextResponse, FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app import models, schemas
from app.playwright_generator import generate_playwright_python, generate_playwright_typescript
from app.config import settings

router = APIRouter(tags=["Recordings"])

RECORDINGS_DIR = os.path.join(settings.UPLOAD_DIR.replace("uploads", "recordings"))


def _ensure_recordings_dir():
    os.makedirs(RECORDINGS_DIR, exist_ok=True)


def _serialize_recording(r: models.BugRecording) -> dict:
    return {
        "id": r.id,
        "bug_id": r.bug_id,
        "user_id": r.user_id,
        "video_path": r.video_path,
        "actions_json": r.actions_json or [],
        "generated_script_py": r.generated_script_py,
        "generated_script_ts": r.generated_script_ts,
        "duration_ms": r.duration_ms,
        "created_at": r.created_at,
    }


# ─── Start Recording ──────────────────────────────────────────────────────────

@router.post("/recordings/start", status_code=status.HTTP_201_CREATED)
def start_recording(
    payload: schemas.RecordingStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bug = db.query(models.Bug).filter(models.Bug.id == payload.bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    recording = models.BugRecording(
        id=str(uuid.uuid4()),
        bug_id=payload.bug_id,
        user_id=current_user.id,
        actions_json=[],
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)
    return {"recording_id": recording.id}


# ─── Stop Recording ───────────────────────────────────────────────────────────

@router.post("/recordings/{recording_id}/stop", response_model=schemas.RecordingResponse)
async def stop_recording(
    recording_id: str,
    actions: str = Form("[]"),          # JSON string of rrweb events
    duration_ms: Optional[int] = Form(None),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    import json

    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Parse actions
    try:
        actions_list = json.loads(actions)
    except Exception:
        actions_list = []

    recording.actions_json = actions_list
    recording.duration_ms = duration_ms

    # Save video file if provided
    if video and video.filename:
        _ensure_recordings_dir()
        ext = os.path.splitext(video.filename)[1] or ".webm"
        video_filename = f"{recording_id}{ext}"
        video_path = os.path.join(RECORDINGS_DIR, video_filename)
        with open(video_path, "wb") as f:
            content = await video.read()
            f.write(content)
        # Store relative path served via /static
        recording.video_path = f"recordings/{video_filename}"

    # Generate Playwright scripts
    try:
        recording.generated_script_py = generate_playwright_python(actions_list)
        recording.generated_script_ts = generate_playwright_typescript(actions_list)
    except Exception as e:
        recording.generated_script_py = f"# Error generating script: {e}"
        recording.generated_script_ts = f"// Error generating script: {e}"

    db.commit()
    db.refresh(recording)
    return _serialize_recording(recording)


# ─── Get Recording ────────────────────────────────────────────────────────────

@router.get("/recordings/{recording_id}", response_model=schemas.RecordingResponse)
def get_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return _serialize_recording(recording)


# ─── List Recordings for a Bug ────────────────────────────────────────────────

@router.get("/bugs/{bug_id}/recordings", response_model=List[schemas.RecordingResponse])
def list_bug_recordings(
    bug_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recordings = db.query(models.BugRecording).filter(
        models.BugRecording.bug_id == bug_id
    ).order_by(models.BugRecording.created_at.desc()).all()
    return [_serialize_recording(r) for r in recordings]


# ─── Delete Recording ─────────────────────────────────────────────────────────

@router.delete("/recordings/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    # Remove video file if exists
    if recording.video_path:
        full_path = os.path.join("static", recording.video_path)
        if os.path.exists(full_path):
            os.remove(full_path)
    db.delete(recording)
    db.commit()


# ─── Download Scripts ─────────────────────────────────────────────────────────

@router.get("/recordings/{recording_id}/script/python", response_class=PlainTextResponse)
def download_python_script(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    script = recording.generated_script_py or generate_playwright_python(recording.actions_json or [])
    return PlainTextResponse(
        content=script,
        headers={"Content-Disposition": f"attachment; filename=recording_{recording_id}.py"},
        media_type="text/plain",
    )


@router.get("/recordings/{recording_id}/script/typescript", response_class=PlainTextResponse)
def download_typescript_script(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    script = recording.generated_script_ts or generate_playwright_typescript(recording.actions_json or [])
    return PlainTextResponse(
        content=script,
        headers={"Content-Disposition": f"attachment; filename=recording_{recording_id}.spec.ts"},
        media_type="text/plain",
    )


@router.post("/recordings/{recording_id}/regenerate", response_model=schemas.RecordingResponse)
def regenerate_script(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    recording.generated_script_py = generate_playwright_python(recording.actions_json or [])
    recording.generated_script_ts = generate_playwright_typescript(recording.actions_json or [])
    db.commit()
    db.refresh(recording)
    return _serialize_recording(recording)


# ─── Playwright Codegen Subprocess Runner ─────────────────────────────────────

def _run_codegen_subprocess(recording_id: str, target_url: str, language: str):
    import subprocess
    import tempfile
    from app.database import SessionLocal

    target_lang = "python" if language == "python" else "javascript"
    ext = ".py" if target_lang == "python" else ".js"

    with tempfile.NamedTemporaryFile(mode="w", suffix=ext, delete=False, encoding="utf-8") as tmp:
        output_file = tmp.name

    try:
        cmd = [sys.executable, "-m", "playwright", "codegen", target_url, "--target", target_lang, "-o", output_file]
        try:
            subprocess.run(cmd, timeout=300)
        except Exception:
            cmd = ["playwright", "codegen", target_url, "--target", target_lang, "-o", output_file]
            subprocess.run(cmd, timeout=300)

        if os.path.exists(output_file):
            with open(output_file, "r", encoding="utf-8") as f:
                content = f.read()
            if content.strip():
                db = SessionLocal()
                try:
                    rec = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
                    if rec:
                        if target_lang == "python":
                            rec.generated_script_py = content
                        else:
                            rec.generated_script_ts = content
                        db.commit()
                finally:
                    db.close()
    except Exception as e:
        print(f"Playwright codegen error: {e}")
    finally:
        if os.path.exists(output_file):
            try:
                os.remove(output_file)
            except Exception:
                pass


# ─── Launch Interactive Playwright Codegen ────────────────────────────────────

@router.post("/recordings/launch-codegen", status_code=status.HTTP_201_CREATED)
def launch_playwright_codegen(
    payload: schemas.CodegenLaunchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bug = db.query(models.Bug).filter(models.Bug.id == payload.bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    recording = models.BugRecording(
        id=str(uuid.uuid4()),
        bug_id=payload.bug_id,
        user_id=current_user.id,
        actions_json=[],
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    target_lang = "python" if payload.language == "python" else "javascript"
    cli_cmd = f"playwright codegen {payload.target_url} --target {target_lang} -o recording_{recording.id[:8]}.py"

    # Launch background task to run codegen
    background_tasks.add_task(_run_codegen_subprocess, recording.id, payload.target_url, payload.language)

    return {
        "recording_id": recording.id,
        "status": "launched",
        "cli_command": cli_cmd,
        "message": "Playwright recorder initiated. Reproduce the bug in the browser and close it when done.",
    }


# ─── Custom / Pasted Script Creation ──────────────────────────────────────────

@router.post("/recordings/custom-script", response_model=schemas.RecordingResponse, status_code=status.HTTP_201_CREATED)
def create_custom_script(
    payload: schemas.CustomScriptCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bug = db.query(models.Bug).filter(models.Bug.id == payload.bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    recording = models.BugRecording(
        id=str(uuid.uuid4()),
        bug_id=payload.bug_id,
        user_id=current_user.id,
        actions_json=[],
        generated_script_py=payload.generated_script_py,
        generated_script_ts=payload.generated_script_ts,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)
    return _serialize_recording(recording)


# ─── Update Existing Script ───────────────────────────────────────────────────

@router.put("/recordings/{recording_id}/script", response_model=schemas.RecordingResponse)
def update_recording_script(
    recording_id: str,
    payload: schemas.ScriptUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    if payload.generated_script_py is not None:
        recording.generated_script_py = payload.generated_script_py
    if payload.generated_script_ts is not None:
        recording.generated_script_ts = payload.generated_script_ts

    db.commit()
    db.refresh(recording)
    return _serialize_recording(recording)


# ─── Share with Developer ─────────────────────────────────────────────────────

@router.post("/recordings/{recording_id}/share-to-dev")
def share_recording_to_dev(
    recording_id: str,
    payload: schemas.ShareWithDevRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recording = db.query(models.BugRecording).filter(models.BugRecording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    bug = db.query(models.Bug).filter(models.Bug.id == recording.bug_id).first()
    if not bug:
        raise HTTPException(status_code=404, detail="Bug not found")

    dev_name = bug.assignee.name if bug.assignee else "the Developer"
    custom_msg = payload.message.strip() if payload.message else "A Playwright automation test script has been attached to reproduce and verify this bug."

    comment_text = (
        f"🤖 **Automated Playwright Test Script Ready for {dev_name}**\n\n"
        f"{custom_msg}\n\n"
        f"• **Recording ID**: `{recording.id}`\n"
        f"• **Actions Captured**: {len(recording.actions_json or [])}\n"
        f"• **How to use**:\n"
        f"  1. Go to the **Recording tab** on this bug.\n"
        f"  2. Click **Run Replay** (choose Headed or Headless) to run the test.\n"
        f"  3. Keep running this test repeatedly while coding until it passes!\n"
    )

    comment = models.Comment(
        id=str(uuid.uuid4()),
        bug_id=bug.id,
        user_id=current_user.id,
        text=comment_text,
    )
    db.add(comment)

    history = models.BugHistoryEntry(
        id=str(uuid.uuid4()),
        bug_id=bug.id,
        field="recording",
        old_value="",
        new_value=recording.id,
        changed_by=current_user.id,
        action="test_shared",
        description=f"{current_user.name} shared Playwright automation test with {dev_name}",
    )
    db.add(history)
    db.commit()

    return {"status": "shared", "comment_id": comment.id}


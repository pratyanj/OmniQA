import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app import models, schemas

router = APIRouter(prefix="/bugs", tags=["Bugs"])

def map_bug_to_response(b: models.Bug) -> dict:
    # Map attachments list
    atts = []
    for a in b.attachments:
        atts.append({
            "id": a.id,
            "bug_id": a.bug_id,
            "name": a.name,
            "size": a.size,
            "type": a.type,
            "url": a.url,
            "uploaded_by": a.uploaded_by,
            "uploaded_at": a.uploaded_at,
            "mimeType": a.mime_type
        })
        
    # Map comments list
    comms = []
    for c in b.comments:
        comms.append({
            "id": c.id,
            "bug_id": c.bug_id,
            "user_id": c.user_id,
            "text": c.text,
            "timestamp": c.timestamp
        })
        
    # Map history changes list
    hist = []
    for h in b.history:
        hist.append({
            "id": h.id,
            "bugId": h.bug_id,
            "field": h.field,
            "oldValue": h.old_value,
            "newValue": h.new_value,
            "changedBy": h.changed_by,
            "timestamp": h.timestamp,
            "action": h.action,
            "description": h.description
        })
        
    # Map QA verification metadata dict
    qa_val = b.qa_verification or {}
    qa_data = {
        "fixVersion": qa_val.get("fixVersion"),
        "buildNumber": qa_val.get("buildNumber"),
        "testNotes": qa_val.get("testNotes"),
        "verifiedBy": qa_val.get("verifiedBy"),
        "verifiedAt": qa_val.get("verifiedAt"),
        "reopenReason": qa_val.get("reopenReason"),
        "reopenedBy": qa_val.get("reopenedBy"),
        "reopenedAt": qa_val.get("reopenedAt")
    }

    return {
        "id": b.id,
        "bugId": b.bug_id,
        "title": b.title,
        "projectId": b.project_id,
        "reportedBy": b.reported_by,
        "assignedTo": b.assigned_to,
        "status": b.status,
        "severity": b.severity,
        "priority": b.priority,
        "type": b.type,
        "environment": b.environment,
        "platform": b.platform,
        "affectedVersion": b.affected_version or "",
        "description": b.description or "",
        "stepsToReproduce": b.steps_to_reproduce or [],
        "expectedResult": b.expected_result or "",
        "actualResult": b.actual_result or "",
        "tags": b.tags or [],
        "createdAt": b.created_at,
        "updatedAt": b.updated_at,
        "resolvedAt": b.resolved_at,
        "closedAt": b.closed_at,
        "deviceInfo": {
            "browser": b.browser or "",
            "os": b.os or "",
            "appVersion": b.app_version or "",
            "url": b.url or "",
            "operatorName": b.operator_name or "",
            "deviceLogs": b.device_logs or ""
        },
        "developerInfo": {
            "assignedTo": b.assigned_to,
            "estimatedFixTime": b.estimated_fix_time or "",
            "branchName": b.branch_name or "",
            "commitId": b.commit_id or "",
            "pullRequestLink": b.pull_request_link or ""
        },
        "qaVerification": qa_data,
        "comments": comms,
        "attachments": atts,
        "history": hist
    }

def add_history_entry(db: Session, bug_id: str, action: str, description: str, changed_by: str, field: str = "", old_val: str = "", new_val: str = ""):
    entry = models.BugHistoryEntry(
        id=str(uuid.uuid4()),
        bug_id=bug_id,
        field=field,
        old_value=old_val,
        new_value=new_val,
        changed_by=changed_by,
        action=action,
        description=description,
        timestamp=datetime.utcnow()
    )
    db.add(entry)

@router.get("", response_model=List[schemas.BugResponse])
def read_bugs(
    search: Optional[str] = None,
    projectId: Optional[str] = None,
    assignedTo: Optional[str] = None,
    status: Optional[List[str]] = Query(None),
    severity: Optional[List[str]] = Query(None),
    priority: Optional[List[str]] = Query(None),
    type: Optional[List[str]] = Query(None),
    platform: Optional[List[str]] = Query(None),
    sortBy: str = "createdAt",
    sortDir: str = "desc",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Bug)

    # Apply standard project/assignee filters
    if projectId:
        query = query.filter(models.Bug.project_id == projectId)
    if assignedTo:
        query = query.filter(models.Bug.assigned_to == assignedTo)

    # Apply search filter (queries title, bug_id, description, or tags)
    if search:
        q = f"%{search}%"
        query = query.filter(
            models.Bug.title.ilike(q) |
            models.Bug.bug_id.ilike(q) |
            models.Bug.description.ilike(q)
        )

    # Apply query list parameters
    if status:
        query = query.filter(models.Bug.status.in_(status))
    if severity:
        query = query.filter(models.Bug.severity.in_(severity))
    if priority:
        query = query.filter(models.Bug.priority.in_(priority))
    if type:
        query = query.filter(models.Bug.type.in_(type))
    if platform:
        query = query.filter(models.Bug.platform.in_(platform))

    # Fetch rows
    bugs = query.all()

    # Convert results into mapped responses
    mapped_bugs = [map_bug_to_response(b) for b in bugs]

    # Handle sorting directions dynamically in memory or query
    reverse = (sortDir == "desc")
    if sortBy == "severity":
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "cosmetic": 4}
        mapped_bugs.sort(key=lambda x: order.get(x["severity"], 5), reverse=reverse)
    elif sortBy == "priority":
        order = {"p0": 0, "p1": 1, "p2": 2, "p3": 3}
        mapped_bugs.sort(key=lambda x: order.get(x["priority"], 5), reverse=reverse)
    elif sortBy == "status":
        order = {"new": 0, "triaged": 1, "assigned": 2, "in_development": 3, "ready_for_qa": 4, "reopened": 5, "verified": 6, "closed": 7, "rejected": 8}
        mapped_bugs.sort(key=lambda x: order.get(x["status"], 9), reverse=reverse)
    elif sortBy == "updatedAt":
        mapped_bugs.sort(key=lambda x: x["updatedAt"], reverse=reverse)
    else:  # Defaults to createdAt
        mapped_bugs.sort(key=lambda x: x["createdAt"], reverse=reverse)

    return mapped_bugs

@router.post("", response_model=schemas.BugResponse, status_code=status.HTTP_201_CREATED)
def create_bug(payload: schemas.BugCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Calculate incremental BUG ID suffix
    bug_count = db.query(models.Bug).count() + 1
    new_bug_id = f"BUG-2026-{str(bug_count).zfill(5)}"
    bug_uuid = str(uuid.uuid4())

    # Map nested schemas cleanly
    dev_info = payload.developerInfo or schemas.DeveloperInfoSchema()
    dev_assigned = dev_info.assignedTo if dev_info.assignedTo else None
    
    device_info = payload.deviceInfo or schemas.DeviceInfoSchema()

    bug = models.Bug(
        id=bug_uuid,
        bug_id=new_bug_id,
        title=payload.title,
        project_id=payload.projectId,
        reported_by=current_user.id,
        assigned_to=dev_assigned,
        status=payload.status,
        severity=payload.severity,
        priority=payload.priority,
        type=payload.type,
        environment=payload.environment,
        platform=payload.platform,
        affected_version=payload.affectedVersion,
        description=payload.description,
        steps_to_reproduce=payload.stepsToReproduce,
        expected_result=payload.expectedResult,
        actual_result=payload.actualResult,
        
        # System details
        browser=device_info.browser,
        os=device_info.os,
        app_version=device_info.appVersion,
        url=device_info.url,
        operator_name=device_info.operatorName,
        device_logs=device_info.deviceLogs,
        
        # Dev planning info
        branch_name=dev_info.branchName,
        commit_id=dev_info.commitId,
        pull_request_link=dev_info.pullRequestLink,
        estimated_fix_time=dev_info.estimatedFixTime,
        
        tags=payload.tags,
        qa_verification={}
    )
    db.add(bug)
    db.commit()

    # Save attachments associated upon creation
    for att in payload.attachments:
        db_att = models.Attachment(
            id=str(uuid.uuid4()),
            bug_id=bug_uuid,
            name=att.name,
            size=att.size,
            type=att.type,
            url=att.url,
            uploaded_by=current_user.id,
            mime_type=att.mimeType
        )
        db.add(db_att)

    # Log bug creation in history timeline
    add_history_entry(db, bug_uuid, "created", "Bug created by reporter", current_user.id, "status", "", "new")
    db.commit()
    db.refresh(bug)

    return map_bug_to_response(bug)

@router.get("/{id}", response_model=schemas.BugResponse)
def read_bug(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bug = db.query(models.Bug).filter(models.Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")
    return map_bug_to_response(bug)

@router.patch("/{id}", response_model=schemas.BugResponse)
def update_bug(id: str, payload: schemas.BugUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bug = db.query(models.Bug).filter(models.Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")

    # Keep list of changed fields to commit to history timeline
    changes = []
    
    update_data = payload.model_dump(exclude_unset=True)
    
    # Process basic updates
    for field, value in update_data.items():
        if field in ["deviceInfo", "developerInfo"]:
            continue
        old_val = getattr(bug, field, "")
        if old_val != value:
            setattr(bug, field, value)
            changes.append((field, str(old_val), str(value)))

    # Process nested technical info schema changes
    if payload.deviceInfo:
        device_data = payload.deviceInfo.model_dump(exclude_unset=True)
        for field, value in device_data.items():
            db_field = "browser" if field == "browser" else "os" if field == "os" else "app_version" if field == "appVersion" else "url" if field == "url" else "operator_name" if field == "operatorName" else "device_logs"
            old_val = getattr(bug, db_field, "")
            if old_val != value:
                setattr(bug, db_field, value)
                changes.append((field, str(old_val), str(value)))

    # Process nested developer planning info changes
    if payload.developerInfo:
        dev_data = payload.developerInfo.model_dump(exclude_unset=True)
        for field, value in dev_data.items():
            db_field = "assigned_to" if field == "assignedTo" else "estimated_fix_time" if field == "estimatedFixTime" else "branch_name" if field == "branchName" else "commit_id" if field == "commitId" else "pull_request_link"
            old_val = getattr(bug, db_field, "")
            if old_val != value:
                setattr(bug, db_field, value)
                changes.append((field, str(old_val), str(value)))

    # Log changes in history timeline
    for field, old_val, new_val in changes:
        add_history_entry(db, bug.id, "updated", f"Updated field: {field}", current_user.id, field, old_val, new_val)

    bug.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bug)
    return map_bug_to_response(bug)

@router.post("/{id}/assign", response_model=schemas.BugResponse)
def assign_bug(id: str, assigneeId: str = Query(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bug = db.query(models.Bug).filter(models.Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")

    old_assignee = bug.assigned_to
    bug.assigned_to = assigneeId if assigneeId else None
    
    # Auto transition to assigned if the ticket is new/triaged
    if bug.status in ["new", "triaged"] and assigneeId:
        bug.status = "assigned"

    # Add history entry
    add_history_entry(db, bug.id, "assigned", "Bug assigned to developer", current_user.id, "assignedTo", old_assignee or "", assigneeId)
    
    bug.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bug)
    return map_bug_to_response(bug)

@router.post("/{id}/status", response_model=schemas.BugResponse)
def change_status(id: str, newStatus: str = Query(...), note: Optional[str] = Query(None), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bug = db.query(models.Bug).filter(models.Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")

    old_status = bug.status
    bug.status = newStatus
    
    now = datetime.utcnow()
    if newStatus == "verified":
        bug.resolved_at = now
    elif newStatus == "closed":
        bug.closed_at = now

    # Log history entry
    desc = note if note else f"Status changed to {newStatus}"
    add_history_entry(db, bug.id, "status_changed", desc, current_user.id, "status", old_status, newStatus)
    
    bug.updated_at = now
    db.commit()
    db.refresh(bug)
    return map_bug_to_response(bug)

@router.post("/{id}/comments", response_model=schemas.CommentResponse)
def add_comment(id: str, payload: schemas.CommentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bug = db.query(models.Bug).filter(models.Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")

    comment = models.Comment(
        id=str(uuid.uuid4()),
        bug_id=id,
        user_id=current_user.id,
        text=payload.text,
        timestamp=datetime.utcnow()
    )
    db.add(comment)

    # Log comment action inside history timeline
    add_history_entry(db, id, "commented", "Comment added to ticket", current_user.id)
    
    db.commit()
    db.refresh(comment)
    return comment

@router.post("/{id}/verify", response_model=schemas.BugResponse)
def verify_bug(id: str, payload: schemas.BugVerifyRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bug = db.query(models.Bug).filter(models.Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")

    old_status = bug.status
    now = datetime.utcnow()
    
    # Save verification details inside dynamic JSONB block
    bug.qa_verification = {
        "fixVersion": payload.fixVersion,
        "buildNumber": payload.buildNumber,
        "testNotes": payload.notes,
        "verifiedBy": current_user.id,
        "verifiedAt": now.isoformat()
    }
    bug.status = "verified"
    bug.resolved_at = now

    add_history_entry(db, bug.id, "verified", "Bug verified by QA", current_user.id, "status", old_status, "verified")
    
    bug.updated_at = now
    db.commit()
    db.refresh(bug)
    return map_bug_to_response(bug)

@router.post("/{id}/reopen", response_model=schemas.BugResponse)
def reopen_bug(id: str, payload: schemas.BugReopenRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    bug = db.query(models.Bug).filter(models.Bug.id == id).first()
    if not bug:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")

    old_status = bug.status
    now = datetime.utcnow()
    
    # Save reopen details inside dynamic JSONB block
    bug.qa_verification = {
        "reopenReason": payload.reason,
        "reopenedBy": current_user.id,
        "reopenedAt": now.isoformat()
    }
    bug.status = "reopened"
    bug.resolved_at = None

    add_history_entry(db, bug.id, "reopened", f"Bug reopened: {payload.reason}", current_user.id, "status", old_status, "reopened")
    
    bug.updated_at = now
    db.commit()
    db.refresh(bug)
    return map_bug_to_response(bug)

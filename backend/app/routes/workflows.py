import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, require_roles
from app import models, schemas

router = APIRouter(tags=["Workflows"])


# ─── Helper: serialize workflow ───────────────────────────────────────────────

def _serialize_workflow(wf: models.WorkflowTemplate) -> dict:
    return {
        "id": wf.id,
        "name": wf.name,
        "description": wf.description,
        "is_default": wf.is_default,
        "created_at": wf.created_at,
        "updated_at": wf.updated_at,
        "nodes": [
            {
                "id": n.id,
                "workflow_id": n.workflow_id,
                "name": n.name,
                "color": n.color,
                "icon": n.icon,
                "position_x": n.position_x,
                "position_y": n.position_y,
                "is_start": n.is_start,
                "is_end": n.is_end,
            }
            for n in wf.nodes
        ],
        "edges": [
            {
                "id": e.id,
                "workflow_id": e.workflow_id,
                "source_node_id": e.source_node_id,
                "target_node_id": e.target_node_id,
                "label": e.label,
                "requires_comment": e.requires_comment,
                "requires_attachment": e.requires_attachment,
            }
            for e in wf.edges
        ],
    }


def _resolve_and_save_nodes_edges(
    db: Session,
    workflow_id: str,
    nodes: List[schemas.WorkflowNodeCreate],
    edges: List[schemas.WorkflowEdgeCreate],
):
    """
    Create WorkflowNode rows first, build a temp_id→real_id map,
    then create WorkflowEdge rows resolving temp_id references.
    """
    temp_to_real: dict[str, str] = {}

    for nc in nodes:
        node_id = str(uuid.uuid4())
        if nc.temp_id:
            temp_to_real[nc.temp_id] = node_id
        db_node = models.WorkflowNode(
            id=node_id,
            workflow_id=workflow_id,
            name=nc.name,
            color=nc.color,
            icon=nc.icon,
            position_x=nc.position_x,
            position_y=nc.position_y,
            is_start=nc.is_start,
            is_end=nc.is_end,
        )
        db.add(db_node)

    db.flush()  # ensure nodes exist before edges reference them

    for ec in edges:
        src = temp_to_real.get(ec.source_temp_id or "", ec.source_node_id)
        tgt = temp_to_real.get(ec.target_temp_id or "", ec.target_node_id)
        db_edge = models.WorkflowEdge(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            source_node_id=src,
            target_node_id=tgt,
            label=ec.label,
            requires_comment=ec.requires_comment,
            requires_attachment=ec.requires_attachment,
        )
        db.add(db_edge)


# ─── Workflow CRUD ─────────────────────────────────────────────────────────────

@router.post("/workflows", response_model=schemas.WorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(
    payload: schemas.WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"])),
):
    wf_id = str(uuid.uuid4())
    wf = models.WorkflowTemplate(
        id=wf_id,
        name=payload.name,
        description=payload.description,
        is_default=payload.is_default,
    )
    db.add(wf)
    db.flush()

    _resolve_and_save_nodes_edges(db, wf_id, payload.nodes, payload.edges)
    db.commit()
    db.refresh(wf)
    return _serialize_workflow(wf)


@router.get("/workflows", response_model=List[schemas.WorkflowResponse])
def list_workflows(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    workflows = db.query(models.WorkflowTemplate).all()
    return [_serialize_workflow(wf) for wf in workflows]


@router.get("/workflows/{workflow_id}", response_model=schemas.WorkflowResponse)
def get_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    wf = db.query(models.WorkflowTemplate).filter(models.WorkflowTemplate.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _serialize_workflow(wf)


@router.put("/workflows/{workflow_id}", response_model=schemas.WorkflowResponse)
def update_workflow(
    workflow_id: str,
    payload: schemas.WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"])),
):
    wf = db.query(models.WorkflowTemplate).filter(models.WorkflowTemplate.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if payload.name is not None:
        wf.name = payload.name
    if payload.description is not None:
        wf.description = payload.description
    if payload.is_default is not None:
        wf.is_default = payload.is_default
    wf.updated_at = datetime.utcnow()

    # Full replace of nodes + edges when provided
    if payload.nodes is not None:
        # Delete all existing nodes (cascade deletes edges)
        db.query(models.WorkflowNode).filter(models.WorkflowNode.workflow_id == workflow_id).delete()
        db.flush()
        _resolve_and_save_nodes_edges(db, workflow_id, payload.nodes, payload.edges or [])

    db.commit()
    db.refresh(wf)
    return _serialize_workflow(wf)


@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"])),
):
    wf = db.query(models.WorkflowTemplate).filter(models.WorkflowTemplate.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()


# ─── Project ↔ Workflow assignment ────────────────────────────────────────────

@router.post("/projects/{project_id}/workflow", status_code=status.HTTP_200_OK)
def assign_workflow_to_project(
    project_id: str,
    payload: schemas.WorkflowAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin", "qa_lead"])),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    wf = db.query(models.WorkflowTemplate).filter(models.WorkflowTemplate.id == payload.workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Upsert project_workflows row
    existing = db.query(models.ProjectWorkflow).filter(
        models.ProjectWorkflow.project_id == project_id
    ).first()
    if existing:
        existing.workflow_id = payload.workflow_id
        existing.assigned_at = datetime.utcnow()
    else:
        db.add(models.ProjectWorkflow(project_id=project_id, workflow_id=payload.workflow_id))

    db.commit()
    return {"project_id": project_id, "workflow_id": payload.workflow_id}


@router.get("/projects/{project_id}/workflow", response_model=Optional[schemas.WorkflowResponse])
def get_project_workflow(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    pw = db.query(models.ProjectWorkflow).filter(
        models.ProjectWorkflow.project_id == project_id
    ).first()
    if not pw:
        # Return default workflow if one exists
        wf = db.query(models.WorkflowTemplate).filter(
            models.WorkflowTemplate.is_default == True
        ).first()
        if wf:
            return _serialize_workflow(wf)
        return None

    wf = db.query(models.WorkflowTemplate).filter(
        models.WorkflowTemplate.id == pw.workflow_id
    ).first()
    if not wf:
        return None
    return _serialize_workflow(wf)


# ─── Transition validation helper (used by bugs router) ────────────────────────

def validate_transition(
    db: Session,
    project_id: str,
    current_status: str,
    requested_status: str,
) -> tuple[bool, bool, bool]:
    """
    Returns (is_valid, requires_comment, requires_attachment).
    If no workflow is assigned and no default exists, transition is permissive.
    """
    pw = db.query(models.ProjectWorkflow).filter(
        models.ProjectWorkflow.project_id == project_id
    ).first()

    wf = None
    if pw:
        wf = db.query(models.WorkflowTemplate).filter(
            models.WorkflowTemplate.id == pw.workflow_id
        ).first()
    if not wf:
        wf = db.query(models.WorkflowTemplate).filter(
            models.WorkflowTemplate.is_default == True
        ).first()

    if not wf:
        # No workflow configured — allow any transition
        return True, False, False

    # Find source node (match by name, case-insensitive normalised)
    def normalise(s: str) -> str:
        return s.lower().replace(" ", "_").replace("-", "_")

    norm_current = normalise(current_status)
    norm_requested = normalise(requested_status)

    src_node = next(
        (n for n in wf.nodes if normalise(n.name) == norm_current),
        None,
    )
    tgt_node = next(
        (n for n in wf.nodes if normalise(n.name) == norm_requested),
        None,
    )

    if not src_node or not tgt_node:
        # Status names not in workflow — allow (graceful fallback)
        return True, False, False

    edge = next(
        (
            e
            for e in wf.edges
            if e.source_node_id == src_node.id and e.target_node_id == tgt_node.id
        ),
        None,
    )

    if not edge:
        return False, False, False

    return True, edge.requires_comment, edge.requires_attachment

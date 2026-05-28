from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import get_current_user
from app import models, schemas

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[schemas.ProjectResponse])
def read_projects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Fetch all software projects
    projects = db.query(models.Project).all()
    return projects

@router.post("", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Enforce unique project keys (e.g. COMMERCE, DASHBOARD)
    existing = db.query(models.Project).filter(models.Project.key == payload.key.upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project key '{payload.key}' already exists.",
        )
    
    project = models.Project(
        name=payload.name,
        description=payload.description,
        key=payload.key.upper(),
        icon=payload.icon
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

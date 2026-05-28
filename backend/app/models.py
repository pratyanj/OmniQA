import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'qa_tester' | 'qa_lead' | 'developer' | 'admin'
    color = Column(String(7), nullable=False, default="#2563eb")  # Hex color code
    initials = Column(String(4), nullable=False)

    # Relationships
    reported_bugs = relationship("Bug", foreign_keys="Bug.reported_by", back_populates="reporter")
    assigned_bugs = relationship("Bug", foreign_keys="Bug.assigned_to", back_populates="assignee")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    history_entries = relationship("BugHistoryEntry", back_populates="changed_by_user")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    key = Column(String(50), nullable=False, unique=True)
    icon = Column(String(50), nullable=False, default="📦")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bugs = relationship("Bug", back_populates="project", cascade="all, delete-orphan")

class Bug(Base):
    __tablename__ = "bugs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bug_id = Column(String(50), unique=True, nullable=False, index=True)  # e.g., BUG-2026-00001
    title = Column(String(255), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    reported_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Bug Properties
    status = Column(String(50), nullable=False, default="new")
    severity = Column(String(50), nullable=False, default="medium")
    priority = Column(String(50), nullable=False, default="p2")
    type = Column(String(50), nullable=False, default="functional")
    environment = Column(String(50), nullable=False, default="production")
    platform = Column(String(50), nullable=False, default="windows")
    affected_version = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    steps_to_reproduce = Column(JSON, nullable=False, default=list)  # Stored as serialized JSON list
    expected_result = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    
    # Technical Environment details
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    app_version = Column(String(100), nullable=True)
    url = Column(String(255), nullable=True)
    operator_name = Column(String(255), nullable=True)
    device_logs = Column(Text, nullable=True)  # Stack traces
    
    # Developer details
    branch_name = Column(String(255), nullable=True)
    commit_id = Column(String(100), nullable=True)
    pull_request_link = Column(String(255), nullable=True)
    estimated_fix_time = Column(String(100), nullable=True)
    
    # Tags & Dates
    tags = Column(JSON, nullable=False, default=list)  # JSON array
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    qa_verification = Column(JSON, nullable=False, default=dict)

    # Relationships
    project = relationship("Project", back_populates="bugs")
    reporter = relationship("User", foreign_keys=[reported_by], back_populates="reported_bugs")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_bugs")
    comments = relationship("Comment", back_populates="bug", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="bug", cascade="all, delete-orphan")
    history = relationship("BugHistoryEntry", back_populates="bug", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bug_id = Column(String(36), ForeignKey("bugs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bug = relationship("Bug", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bug_id = Column(String(36), ForeignKey("bugs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    size = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)  # 'image' | 'video' | 'other'
    url = Column(Text, nullable=False)  # Hosted URL
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    mime_type = Column(String(100), nullable=True)

    # Relationships
    bug = relationship("Bug", back_populates="attachments")

class BugHistoryEntry(Base):
    __tablename__ = "bug_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bug_id = Column(String(36), ForeignKey("bugs.id", ondelete="CASCADE"), nullable=False)
    field = Column(String(100), nullable=False, default="")
    old_value = Column(Text, nullable=False, default="")
    new_value = Column(Text, nullable=False, default="")
    changed_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String(100), nullable=False)  # 'created' | 'status_changed' | 'assigned' | 'commented' | 'attachment_added'
    description = Column(Text, nullable=False)

    # Relationships
    bug = relationship("Bug", back_populates="history")
    changed_by_user = relationship("User", back_populates="history_entries")

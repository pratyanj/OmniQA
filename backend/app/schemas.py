from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# ─── USER SCHEMAS ──────────────────────────────────────────────────────────
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str
    color: str
    initials: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ─── PROJECT SCHEMAS ───────────────────────────────────────────────────────
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    key: str
    icon: str = "📦"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ─── NESTED SUB-SCHEMAS ALIGNED WITH REACT FRONTEND TYPES ──────────────────
class DeviceInfoSchema(BaseModel):
    browser: Optional[str] = ""
    os: Optional[str] = ""
    appVersion: Optional[str] = ""
    url: Optional[str] = ""
    operatorName: Optional[str] = ""
    deviceLogs: Optional[str] = ""

class DeveloperInfoSchema(BaseModel):
    assignedTo: Optional[str] = None
    estimatedFixTime: Optional[str] = ""
    branchName: Optional[str] = ""
    commitId: Optional[str] = ""
    pullRequestLink: Optional[str] = ""

class QAVerificationSchema(BaseModel):
    fixVersion: Optional[str] = None
    buildNumber: Optional[str] = None
    testNotes: Optional[str] = None
    verifiedBy: Optional[str] = None
    verifiedAt: Optional[str] = None
    reopenReason: Optional[str] = None
    reopenedBy: Optional[str] = None
    reopenedAt: Optional[str] = None

# ─── COMMENT SCHEMAS ───────────────────────────────────────────────────────
class CommentBase(BaseModel):
    text: str

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: str
    bug_id: str
    user_id: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

# ─── ATTACHMENT SCHEMAS ────────────────────────────────────────────────────
class AttachmentBase(BaseModel):
    name: str
    size: int
    type: str  # 'image' | 'video' | 'other'
    url: str
    mimeType: Optional[str] = None

class AttachmentCreate(AttachmentBase):
    pass

class AttachmentResponse(AttachmentBase):
    id: str
    bug_id: str
    uploaded_by: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

# ─── BUG HISTORY SCHEMAS ───────────────────────────────────────────────────
class BugHistoryResponse(BaseModel):
    id: str
    bugId: str
    field: str
    oldValue: str
    newValue: str
    changedBy: str
    timestamp: datetime
    action: str
    description: str
    
    class Config:
        from_attributes = True

# ─── BUG SCHEMAS ───────────────────────────────────────────────────────────
class BugBase(BaseModel):
    title: str
    projectId: str
    status: str = "new"
    severity: str = "medium"
    priority: str = "p2"
    type: str = "functional"
    environment: str = "production"
    platform: str = "windows"
    affectedVersion: Optional[str] = ""
    description: Optional[str] = ""
    stepsToReproduce: List[str] = []
    expectedResult: Optional[str] = ""
    actualResult: Optional[str] = ""
    tags: List[str] = []

class BugCreate(BugBase):
    deviceInfo: Optional[DeviceInfoSchema] = Field(default_factory=DeviceInfoSchema)
    developerInfo: Optional[DeveloperInfoSchema] = Field(default_factory=DeveloperInfoSchema)
    attachments: Optional[List[AttachmentCreate]] = []

class BugUpdate(BaseModel):
    title: Optional[str] = None
    projectId: Optional[str] = None
    status: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    type: Optional[str] = None
    environment: Optional[str] = None
    platform: Optional[str] = None
    affectedVersion: Optional[str] = None
    description: Optional[str] = None
    stepsToReproduce: Optional[List[str]] = None
    expectedResult: Optional[str] = None
    actualResult: Optional[str] = None
    assignedTo: Optional[str] = None
    tags: Optional[List[str]] = None
    deviceInfo: Optional[DeviceInfoSchema] = None
    developerInfo: Optional[DeveloperInfoSchema] = None

class BugResponse(BugBase):
    id: str
    bugId: str
    reportedBy: str
    assignedTo: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    resolvedAt: Optional[datetime] = None
    closedAt: Optional[datetime] = None
    
    # Serialized structures matching front-end layouts
    deviceInfo: DeviceInfoSchema
    developerInfo: DeveloperInfoSchema
    qaVerification: QAVerificationSchema
    
    comments: List[CommentResponse] = []
    attachments: List[AttachmentResponse] = []
    history: List[BugHistoryResponse] = []

    class Config:
        from_attributes = True

class BugVerifyRequest(BaseModel):
    fixVersion: str
    buildNumber: Optional[str] = ""
    notes: Optional[str] = ""

class BugReopenRequest(BaseModel):
    reason: str

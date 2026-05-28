import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.routes import auth, projects, bugs, attachments

# Automatically create database tables on application startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# Set up CORS middleware to allow cross-origin requests from our React/Vite frontend port
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Guarantee the local static upload directory exists on disk
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount the static folder directory to serve clipboard screenshots and files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register REST endpoints with API version prefix
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(bugs.router, prefix=settings.API_V1_STR)
app.include_router(attachments.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }

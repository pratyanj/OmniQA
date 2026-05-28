import os
from dotenv import load_dotenv

# Load optional environment variables from a .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "IT QA Defect Tracker API"
    API_V1_STR: str = "/api/v1"
    
    # Auth Security Config
    JWT_SECRET: str = os.getenv("JWT_SECRET", "qa_platform_developer_secret_key_2026_modern_glassmorphic_theme")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days token expiration for dev ease
    
    # Database Configuration (Defaults to SQLite for instant local runs, swaps cleanly to Postgres)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./qa.db")
    
    # File Attachment Storage Config
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "static/uploads")
    
    # CORS Middleware Config
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8006", "*"]

settings = Settings()

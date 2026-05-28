import os
import uuid
from app.config import settings

class StorageService:
    @staticmethod
    def save_file(filename: str, content: bytes) -> str:
        # Guarantee directory existence
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Prepend a short random suffix to eliminate any file collision risks
        unique_prefix = str(uuid.uuid4())[:8]
        clean_filename = f"{unique_prefix}_{filename.replace(' ', '_')}"
        file_path = os.path.join(settings.UPLOAD_DIR, clean_filename)
        
        # Write the binary stream to disk
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Return relative static asset path to be resolved dynamically by the requester context
        return f"static/uploads/{clean_filename}"

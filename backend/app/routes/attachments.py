from fastapi import APIRouter, Depends, UploadFile, File, Request, status
from app.auth import get_current_user
from app.storage import StorageService
from app import models

router = APIRouter(prefix="/attachments", tags=["Attachments"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    # Read the incoming binary stream
    content = await file.read()
    
    # Save the file to disk using the storage engine
    file_static_path = StorageService.save_file(file.filename, content)
    
    # Prepend the incoming request base URL to generate a fully qualified cross-origin asset URL
    base_url = str(request.base_url)
    absolute_url = base_url + file_static_path
    
    return {
        "name": file.filename,
        "size": len(content),
        "type": "image" if file.content_type.startswith("image/") else "other",
        "url": absolute_url,
        "mimeType": file.content_type
    }

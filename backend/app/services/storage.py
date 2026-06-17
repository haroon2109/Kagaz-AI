import os
import shutil
import uuid
from fastapi import UploadFile

class StorageService:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def save_file(self, upload_file: UploadFile) -> str:
        """
        Stub for saving uploaded worksheet images.
        Saves locally and returns static path.
        """
        filename = f"{uuid.uuid4()}-{upload_file.filename}"
        file_path = os.path.join(self.upload_dir, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        return f"/uploads/{filename}"

storage_service = StorageService()

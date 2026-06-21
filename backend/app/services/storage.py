import os
import shutil
import uuid
import re
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

class StorageService:
    def __init__(self, upload_dir: str = settings.UPLOAD_DIR):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, upload_file: UploadFile) -> str:
        """
        Saves uploaded worksheet images locally with strict security validations:
        - Whitelists file extensions and MIME content types.
        - Restricts file sizes to max 5MB.
        - Sanitizes filenames against directory traversal and script injections.
        """
        # 1. Validate Extension
        orig_filename = upload_file.filename or ""
        _, ext = os.path.splitext(orig_filename.lower())
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension {ext}. Allowed: {', '.join(allowed_extensions)}"
            )

        # 2. Validate MIME Content Type
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if upload_file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid content type {upload_file.content_type}. Must be a valid image."
            )

        # 3. Validate File Size (Max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        try:
            # Seek to end to check size
            upload_file.file.seek(0, os.SEEK_END)
            size = upload_file.file.tell()
            # Reset seek position to start for saving
            upload_file.file.seek(0)
            if size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File is too large ({size / (1024 * 1024):.2f}MB). Maximum allowed is 5MB."
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not read file size metadata."
            )

        # 4. Sanitize Filename
        # Remove any non-alphanumeric/dot/dash characters to prevent command/script execution
        clean_basename = re.sub(r"[^\w\.\-]", "_", os.path.basename(orig_filename))
        filename = f"{uuid.uuid4()}-{clean_basename}"
        file_path = os.path.join(self.upload_dir, filename)
        
        # 5. Save the file stream securely using a Spooling Proxy
        # Stream into a localized temp cache first to prevent dropping files during bulk syncs
        chunk_size = 1024 * 1024  # 1MB
        import anyio
        
        spool_dir = os.path.join(self.upload_dir, "spool")
        os.makedirs(spool_dir, exist_ok=True)
        temp_file_path = os.path.join(spool_dir, f"{filename}.tmp")
        
        async def _write_chunks():
            f = open(temp_file_path, "wb")
            try:
                while True:
                    chunk = await upload_file.read(chunk_size)
                    if not chunk:
                        break
                    await anyio.to_thread.run_sync(f.write, chunk)
            except Exception as e:
                f.close()
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                raise HTTPException(status_code=500, detail="Network dropped during file stream") from e
            finally:
                if not f.closed:
                    f.close()
                
        await _write_chunks()
        
        # Atomic transaction: only move to final storage if completely downloaded
        shutil.move(temp_file_path, file_path)
            
        return f"/uploads/{filename}"



storage_service = StorageService()

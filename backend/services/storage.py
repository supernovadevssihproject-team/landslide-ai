import os
import uuid
from pathlib import Path
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "reports"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


class LocalStorageService:
    @staticmethod
    async def save_report_image(report_id: str, upload_file: UploadFile) -> Tuple[str, str, int]:
        content_type = (upload_file.content_type or "").lower()
        if content_type not in ALLOWED_MIME_TYPES:
            # Fallback check extension if content_type is octet-stream
            ext_from_name = Path(upload_file.filename or "").suffix.lower()
            if ext_from_name in [".jpg", ".jpeg"]:
                content_type = "image/jpeg"
            elif ext_from_name == ".png":
                content_type = "image/png"
            elif ext_from_name == ".webp":
                content_type = "image/webp"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported image type '{upload_file.content_type}'. Allowed types: JPEG, PNG, WEBP."
                )

        ext = ALLOWED_MIME_TYPES[content_type]
        safe_report_id = "".join(c for c in report_id if c.isalnum() or c in ("-", "_"))
        target_dir = UPLOADS_DIR / safe_report_id
        target_dir.mkdir(parents=True, exist_ok=True)

        file_uuid = uuid.uuid4().hex
        filename = f"{file_uuid}{ext}"
        file_path = target_dir / filename

        # Security check: Ensure file_path is strictly inside UPLOADS_DIR
        try:
            file_path.resolve().relative_to(UPLOADS_DIR.resolve())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid report ID or storage path."
            )

        content = await upload_file.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image file size exceeds the maximum limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
            )

        with open(file_path, "wb") as f:
            f.write(content)

        storage_key = f"reports/{safe_report_id}/{filename}"
        relative_url = f"/api/reports/{safe_report_id}/image/{filename}"
        size_bytes = len(content)

        return storage_key, relative_url, size_bytes

    @staticmethod
    def get_image_file_path(report_id: str, filename: str) -> Optional[Path]:
        safe_report_id = "".join(c for c in report_id if c.isalnum() or c in ("-", "_"))
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ("-", "_", "."))
        file_path = UPLOADS_DIR / safe_report_id / safe_filename

        try:
            resolved = file_path.resolve()
            if not resolved.relative_to(UPLOADS_DIR.resolve()):
                return None
            if resolved.is_file():
                return resolved
        except Exception:
            return None
        return None


storage_service = LocalStorageService()

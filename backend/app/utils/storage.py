"""
File storage abstraction for local development.

Interface is designed to be swapped for an S3/GCS implementation later.
"""
from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
}
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def get_upload_root() -> Path:
    """Return the root upload directory, creating it if needed."""
    root = Path(os.environ.get("UPLOAD_DIR", "uploads/examinations"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def validate_upload(filename: str, content_type: str, file_size: int, data: bytes | None = None) -> None:
    """
    Validate an incoming upload.
    Raises ValueError with a human-readable message if invalid.
    """
    if file_size <= 0:
        raise ValueError("File cannot be empty.")

    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.")

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file extension '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    if content_type not in ALLOWED_MIME_TYPES and not content_type.startswith("image/"):
        raise ValueError(f"Unsupported content type '{content_type}'.")

    # Prevent path traversal
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid filename.")

    # Magic byte signature check (actual file content verification)
    if data:
        if ext == ".pdf" or content_type == "application/pdf":
            if not data.startswith(b"%PDF"):
                raise ValueError("File content does not match valid PDF signature.")
        elif ext == ".png" or content_type == "image/png":
            if not data.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("File content does not match valid PNG signature.")
        elif ext in [".jpg", ".jpeg"] or content_type in ["image/jpeg", "image/jpg"]:
            if not data.startswith(b"\xff\xd8\xff"):
                raise ValueError("File content does not match valid JPEG signature.")


def save_file(
    data: bytes,
    original_filename: str,
    teacher_id: str,
    examination_id: str,
) -> tuple[str, str]:
    """
    Save bytes to disk under uploads/examinations/{exam_id}/.

    Returns (stored_filename, storage_key).
    storage_key is the path relative to the upload root.
    """
    ext = Path(original_filename).suffix.lower()
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    subdir = get_upload_root() / examination_id
    subdir.mkdir(parents=True, exist_ok=True)

    dest = subdir / stored_filename
    dest.write_bytes(data)
    storage_key = str(Path(examination_id) / stored_filename)
    logger.info("Saved upload: %s", storage_key)
    return stored_filename, storage_key


def delete_file(storage_key: str) -> bool:
    """Delete a stored file. Returns True if deleted, False if not found."""
    path = get_upload_root() / storage_key
    if path.exists():
        path.unlink()
        logger.info("Deleted file: %s", storage_key)
        return True
    return False


def resolve_file_path(storage_key: str) -> Path | None:
    """Return the absolute Path for a storage_key, or None if not found."""
    path = get_upload_root() / storage_key
    return path if path.exists() else None


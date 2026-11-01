"""
File storage abstraction for local development and processing.

Interface is designed to be swapped for an S3/GCS implementation later.
"""
from __future__ import annotations

import io
import logging
import os
import uuid
from pathlib import Path

from PIL import Image
import pypdf

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
}
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_PDF_PAGES = 50
MAX_IMAGE_DIMENSION = 8192


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


def validate_pdf_content(data: bytes, max_pages: int = MAX_PDF_PAGES) -> int:
    """
    Validate PDF content structure and page count using pypdf.
    Returns page count if valid, raises ValueError otherwise.
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError("Encrypted PDF files are not supported.")
        count = len(reader.pages)
        if count == 0:
            raise ValueError("PDF document contains no pages.")
        if count > max_pages:
            raise ValueError(f"PDF exceeds maximum allowed page count ({count} > {max_pages}).")
        return count
    except ValueError:
        raise
    except Exception as e:
        logger.warning("Corrupted or unreadable PDF: %s", e)
        raise ValueError("Corrupted or invalid PDF document.")


def validate_image_content(data: bytes, max_dim: int = MAX_IMAGE_DIMENSION) -> tuple[int, int, str]:
    """
    Validate image integrity and dimensions using Pillow.
    Returns (width, height, format_name), raises ValueError otherwise.
    """
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
        # Re-open after verify to read format and dimensions
        with Image.open(io.BytesIO(data)) as img:
            w, h = img.size
            fmt = img.format or "PNG"
            if w <= 0 or h <= 0:
                raise ValueError("Invalid image dimensions.")
            if w > max_dim or h > max_dim:
                raise ValueError(f"Image dimensions ({w}x{h}) exceed maximum allowed dimension ({max_dim}px).")
            return w, h, fmt
    except ValueError:
        raise
    except Exception as e:
        logger.warning("Corrupted or unreadable image: %s", e)
        raise ValueError("Corrupted or invalid image file.")


def save_file(
    data: bytes,
    original_filename: str,
    teacher_id: str = "",
    examination_id: str = "",
) -> tuple[str, str]:
    """
    Save bytes to disk under uploads/examinations/{exam_id}/.
    Maintained for Phase 2 compatibility.
    """
    ext = Path(original_filename).suffix.lower()
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    subdir = get_upload_root() / (examination_id or "general")
    subdir.mkdir(parents=True, exist_ok=True)

    dest = subdir / stored_filename
    dest.write_bytes(data)
    storage_key = str(Path(examination_id or "general") / stored_filename).replace("\\", "/")
    logger.info("Saved upload: %s", storage_key)
    return stored_filename, storage_key


def save_document_file(
    data: bytes,
    original_filename: str,
    examination_id: str,
    subfolder: str = "documents",
) -> tuple[str, str]:
    """
    Save an uploaded document under uploads/examinations/{exam_id}/{subfolder}/.
    Returns (stored_filename, storage_key).
    """
    ext = Path(original_filename).suffix.lower()
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    subdir = get_upload_root() / examination_id / subfolder
    subdir.mkdir(parents=True, exist_ok=True)

    dest = subdir / stored_filename
    dest.write_bytes(data)
    storage_key = str(Path(examination_id) / subfolder / stored_filename).replace("\\", "/")
    logger.info("Saved document file: %s", storage_key)
    return stored_filename, storage_key


def save_page_image(
    data: bytes,
    examination_id: str,
    document_id: str,
    page_number: int,
    ext: str = ".png",
) -> tuple[str, str]:
    """
    Save an extracted page image under uploads/examinations/{exam_id}/pages/.
    Returns (stored_filename, storage_key).
    """
    if not ext.startswith("."):
        ext = f".{ext}"
    stored_filename = f"{document_id}_p{page_number}_{uuid.uuid4().hex[:8]}{ext}"
    subdir = get_upload_root() / examination_id / "pages"
    subdir.mkdir(parents=True, exist_ok=True)

    dest = subdir / stored_filename
    dest.write_bytes(data)
    storage_key = str(Path(examination_id) / "pages" / stored_filename).replace("\\", "/")
    logger.info("Saved page image: %s", storage_key)
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
    # Prevent path traversal in storage_key
    if ".." in storage_key:
        return None
    path = get_upload_root() / storage_key
    return path if path.exists() else None

"""Unit tests — storage utilities."""
from __future__ import annotations

import os
import tempfile
import pytest
from pathlib import Path
from unittest.mock import patch


def test_validate_upload_ok():
    from app.utils.storage import validate_upload
    validate_upload("test.pdf", "application/pdf", 1024)  # should not raise


def test_validate_upload_too_large():
    from app.utils.storage import validate_upload, MAX_FILE_SIZE_BYTES
    with pytest.raises(ValueError, match="too large"):
        validate_upload("test.pdf", "application/pdf", MAX_FILE_SIZE_BYTES + 1)


def test_validate_upload_bad_extension():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError, match="extension"):
        validate_upload("test.exe", "application/octet-stream", 100)


def test_validate_upload_path_traversal():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError):
        validate_upload("../../etc/passwd", "application/pdf", 100)


def test_validate_upload_png():
    from app.utils.storage import validate_upload
    validate_upload("image.png", "image/png", 1024, data=b"\x89PNG\r\n\x1a\nfakeimagecontent")


def test_validate_upload_empty_file():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError, match="empty"):
        validate_upload("test.pdf", "application/pdf", 0, data=b"")


def test_validate_upload_pdf_magic_bytes_valid():
    from app.utils.storage import validate_upload
    validate_upload("test.pdf", "application/pdf", 100, data=b"%PDF-1.4 sample content")


def test_validate_upload_pdf_magic_bytes_invalid():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError, match="valid PDF signature"):
        validate_upload("test.pdf", "application/pdf", 100, data=b"not-a-pdf-header")


def test_validate_upload_png_magic_bytes_invalid():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError, match="valid PNG signature"):
        validate_upload("test.png", "image/png", 100, data=b"bad png data")


def test_validate_upload_jpeg_magic_bytes_valid():
    from app.utils.storage import validate_upload
    validate_upload("test.jpg", "image/jpeg", 100, data=b"\xff\xd8\xff\xe0\x00\x10JFIF")


def test_validate_upload_jpeg_magic_bytes_invalid():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError, match="valid JPEG signature"):
        validate_upload("test.jpg", "image/jpeg", 100, data=b"bad jpg data")


def test_validate_upload_unsupported_mime():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError, match="Unsupported content type"):
        validate_upload("test.pdf", "text/plain", 100, data=b"%PDF-1.4")


def test_validate_upload_windows_traversal():
    from app.utils.storage import validate_upload
    with pytest.raises(ValueError, match="Invalid filename"):
        validate_upload("..\\..\\secret.pdf", "application/pdf", 100, data=b"%PDF-1.4")


def test_save_and_delete_file():
    from app.utils.storage import save_file, delete_file
    with tempfile.TemporaryDirectory() as tmp:
        with patch("app.utils.storage.get_upload_root", return_value=Path(tmp)):
            stored_name, key = save_file(b"fake pdf content", "test.pdf", "teacher1", "exam1")
            assert stored_name.endswith(".pdf")
            full_path = Path(tmp) / key
            assert full_path.exists()
            assert delete_file(key) is True
            assert not full_path.exists()


def test_delete_nonexistent_file():
    from app.utils.storage import delete_file
    with tempfile.TemporaryDirectory() as tmp:
        with patch("app.utils.storage.get_upload_root", return_value=Path(tmp)):
            result = delete_file("nonexistent/file.pdf")
            assert result is False


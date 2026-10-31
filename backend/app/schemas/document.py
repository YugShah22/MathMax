"""Pydantic schemas for Document upload endpoints."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentType


class _Base(BaseModel):
    model_config = {"use_enum_values": True}


class DocumentResponse(_Base):
    id: str
    examination_id: str
    teacher_id: str
    original_filename: str
    stored_filename: str
    content_type: str
    file_size: int
    document_type: DocumentType
    uploaded_at: datetime


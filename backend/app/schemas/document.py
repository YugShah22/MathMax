"""Pydantic schemas for Document upload and management endpoints."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentStatus, DocumentType


class _Base(BaseModel):
    model_config = {"use_enum_values": True}


class DocumentResponse(_Base):
    id: str
    examination_id: str
    original_filename: str
    stored_filename: str
    content_type: str
    file_size: int
    document_type: DocumentType
    status: DocumentStatus = DocumentStatus.UPLOADED
    teacher_id: str | None = None
    student_id: str | None = None
    submission_id: str | None = None
    page_count: int = 0
    processing_error: str | None = None
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None
    uploaded_at: datetime
    updated_at: datetime | None = None


class DocumentListResponse(_Base):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int

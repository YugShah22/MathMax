"""Pydantic schemas for Document Page endpoints."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.document_page import PageStatus


class _Base(BaseModel):
    model_config = {"use_enum_values": True}


class DocumentPageResponse(_Base):
    id: str
    document_id: str
    examination_id: str
    page_number: int
    original_width: int
    original_height: int
    image_format: str
    file_size: int
    status: PageStatus
    student_id: str | None = None
    error_message: str | None = None
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


class DocumentPageListResponse(_Base):
    items: list[DocumentPageResponse]
    total: int


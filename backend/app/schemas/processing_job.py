"""Pydantic schemas for Processing Job and Status endpoints."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentStatus
from app.models.processing_job import JobStatus, ProcessingStage
from app.schemas.document_page import DocumentPageResponse


class _Base(BaseModel):
    model_config = {"use_enum_values": True}


class ProcessingJobResponse(_Base):
    id: str
    document_id: str
    examination_id: str
    stage: ProcessingStage
    status: JobStatus
    total_pages: int
    processed_pages: int
    failed_pages: int
    student_id: str | None = None
    error_message: str | None = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None


class ProcessingStatusResponse(_Base):
    document_id: str
    examination_id: str
    document_status: DocumentStatus
    page_count: int
    active_job: ProcessingJobResponse | None = None
    pages: list[DocumentPageResponse] = []
    can_retry: bool = False


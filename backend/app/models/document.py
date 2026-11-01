"""
Document (file upload) domain model.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class DocumentType(str, Enum):
    QUESTION_PAPER = "question_paper"
    ANSWER_KEY = "answer_key"
    STUDENT_ANSWER_SHEET = "student_answer_sheet"
    SUPPORTING = "supporting"


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    VALIDATING = "validating"
    READY_FOR_PROCESSING = "ready_for_processing"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


@dataclass
class Document:
    id: str
    examination_id: str
    original_filename: str
    stored_filename: str
    content_type: str
    file_size: int
    storage_key: str        # relative path inside uploads dir
    teacher_id: str | None = None
    student_id: str | None = None
    submission_id: str | None = None
    document_type: DocumentType = DocumentType.SUPPORTING
    status: DocumentStatus = DocumentStatus.UPLOADED
    page_count: int = 0
    processing_error: str | None = None
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None
    uploaded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

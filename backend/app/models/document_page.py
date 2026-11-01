"""
Document Page domain model — extracted image pages of an answer sheet.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class PageStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


@dataclass
class DocumentPage:
    id: str
    document_id: str
    examination_id: str
    page_number: int
    original_width: int
    original_height: int
    image_format: str
    file_size: int
    storage_key: str
    student_id: str | None = None
    status: PageStatus = PageStatus.PENDING
    error_message: str | None = None
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


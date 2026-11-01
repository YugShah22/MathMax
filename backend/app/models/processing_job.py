"""
Processing Job domain model — lifecycle tracking for document processing tasks.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class ProcessingStage(str, Enum):
    INGESTION = "ingestion"
    PAGE_EXTRACTION = "page_extraction"
    PREPROCESSING = "preprocessing"
    OCR = "ocr"
    EVALUATION = "evaluation"


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ProcessingJob:
    id: str
    document_id: str
    examination_id: str
    student_id: str | None = None
    stage: ProcessingStage = ProcessingStage.PAGE_EXTRACTION
    status: JobStatus = JobStatus.QUEUED
    total_pages: int = 0
    processed_pages: int = 0
    failed_pages: int = 0
    error_message: str | None = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    completed_at: datetime | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


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
    SUPPORTING = "supporting"


@dataclass
class Document:
    id: str
    examination_id: str
    teacher_id: str
    original_filename: str
    stored_filename: str
    content_type: str
    file_size: int
    storage_key: str        # relative path inside uploads dir
    document_type: DocumentType = DocumentType.SUPPORTING
    uploaded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


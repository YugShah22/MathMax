"""
Examination domain model.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class ExaminationStatus(str, Enum):
    DRAFT = "draft"
    READY = "ready"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ExaminationType(str, Enum):
    UNIT_TEST = "unit_test"
    MID_TERM = "mid_term"
    FINAL = "final"
    PRACTICE = "practice"
    ASSIGNMENT = "assignment"
    OTHER = "other"


@dataclass
class Examination:
    id: str
    teacher_id: str
    title: str
    subject: str
    total_marks: float
    duration_minutes: int
    description: str = ""
    academic_year: str = ""
    examination_type: ExaminationType = ExaminationType.OTHER
    scheduled_at: datetime | None = None
    status: ExaminationStatus = ExaminationStatus.DRAFT
    question_paper_ref: str | None = None   # document_id
    answer_key_ref: str | None = None       # document_id
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


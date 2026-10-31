"""Pydantic schemas for Examination endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.models.examination import ExaminationStatus, ExaminationType


class _Base(BaseModel):
    model_config = {"str_strip_whitespace": True, "use_enum_values": True}


# ── Requests ──────────────────────────────────────────────────────────────────

class ExaminationCreate(_Base):
    title: Annotated[str, Field(min_length=2, max_length=200)]
    subject: Annotated[str, Field(min_length=1, max_length=100)]
    total_marks: Annotated[float, Field(gt=0, le=1000)]
    duration_minutes: Annotated[int, Field(gt=0, le=600)]
    description: str = ""
    academic_year: str = ""
    examination_type: ExaminationType = ExaminationType.OTHER
    scheduled_at: datetime | None = None


class ExaminationUpdate(_Base):
    title: Annotated[str, Field(min_length=2, max_length=200)] | None = None
    subject: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    total_marks: Annotated[float, Field(gt=0, le=1000)] | None = None
    duration_minutes: Annotated[int, Field(gt=0, le=600)] | None = None
    description: str | None = None
    academic_year: str | None = None
    examination_type: ExaminationType | None = None
    scheduled_at: datetime | None = None


class ExaminationFilters(_Base):
    status: ExaminationStatus | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# ── Responses ─────────────────────────────────────────────────────────────────

class ExaminationResponse(_Base):
    id: str
    teacher_id: str
    title: str
    subject: str
    total_marks: float
    duration_minutes: int
    description: str
    academic_year: str
    examination_type: ExaminationType
    scheduled_at: datetime | None
    status: ExaminationStatus
    question_paper_ref: str | None
    answer_key_ref: str | None
    created_at: datetime
    updated_at: datetime


class ExaminationListResponse(_Base):
    examinations: list[ExaminationResponse]
    total: int
    page: int
    page_size: int
    pages: int


class PublishValidationResponse(_Base):
    can_publish: bool
    reasons: list[str]


"""Pydantic schemas for Question endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.models.question import DifficultyLevel, QuestionType


class _Base(BaseModel):
    model_config = {"str_strip_whitespace": True, "use_enum_values": True}


class QuestionCreate(_Base):
    question_number: Annotated[int, Field(ge=1)]
    question_text: Annotated[str, Field(min_length=1)]
    maximum_marks: Annotated[float, Field(gt=0)]
    question_type: QuestionType = QuestionType.OTHER
    topic: str = ""
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    rubric_id: str | None = None


class QuestionUpdate(_Base):
    question_text: str | None = None
    maximum_marks: Annotated[float, Field(gt=0)] | None = None
    question_type: QuestionType | None = None
    topic: str | None = None
    difficulty: DifficultyLevel | None = None
    rubric_id: str | None = None


class QuestionReorderItem(_Base):
    question_id: str
    question_number: int


class QuestionReorderRequest(_Base):
    questions: list[QuestionReorderItem]


class QuestionResponse(_Base):
    id: str
    examination_id: str
    teacher_id: str
    question_number: int
    question_text: str
    maximum_marks: float
    question_type: QuestionType
    topic: str
    difficulty: DifficultyLevel
    rubric_id: str | None
    expected_answer_ref: str | None
    created_at: datetime
    updated_at: datetime


class QuestionListResponse(_Base):
    questions: list[QuestionResponse]
    total_marks: float


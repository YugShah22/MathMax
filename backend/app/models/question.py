"""
Question domain model.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class QuestionType(str, Enum):
    MATHEMATICAL = "mathematical"
    NUMERICAL = "numerical"
    ALGEBRAIC = "algebraic"
    EQUATION = "equation"
    OTHER = "other"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


@dataclass
class Question:
    id: str
    examination_id: str
    teacher_id: str
    question_number: int
    question_text: str
    maximum_marks: float
    question_type: QuestionType = QuestionType.OTHER
    topic: str = ""
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    expected_answer_ref: str | None = None  # answer_key_id
    rubric_id: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


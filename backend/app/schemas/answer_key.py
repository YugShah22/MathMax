"""Pydantic schemas for Answer-Key endpoints."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class _Base(BaseModel):
    model_config = {"str_strip_whitespace": True}


class ExpectedStepSchema(_Base):
    step_number: int
    description: str
    expression: str = ""
    result: str = ""


class AnswerKeyCreate(_Base):
    expected_answer: str
    expected_steps: list[ExpectedStepSchema] = []
    mathematical_expression: str = ""
    expected_final_answer: str = ""
    accepted_alternatives: list[str] = []
    marking_notes: str = ""


class AnswerKeyUpdate(_Base):
    expected_answer: str | None = None
    expected_steps: list[ExpectedStepSchema] | None = None
    mathematical_expression: str | None = None
    expected_final_answer: str | None = None
    accepted_alternatives: list[str] | None = None
    marking_notes: str | None = None


class AnswerKeyResponse(_Base):
    id: str
    question_id: str
    examination_id: str
    teacher_id: str
    expected_answer: str
    expected_steps: list[ExpectedStepSchema]
    mathematical_expression: str
    expected_final_answer: str
    accepted_alternatives: list[str]
    marking_notes: str
    created_at: datetime
    updated_at: datetime


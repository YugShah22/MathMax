"""
Answer-key domain model.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class ExpectedStep:
    step_number: int
    description: str
    expression: str = ""
    result: str = ""


@dataclass
class AnswerKey:
    id: str
    question_id: str
    examination_id: str
    teacher_id: str
    expected_answer: str
    expected_steps: list[ExpectedStep] = field(default_factory=list)
    mathematical_expression: str = ""
    expected_final_answer: str = ""
    accepted_alternatives: list[str] = field(default_factory=list)
    marking_notes: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


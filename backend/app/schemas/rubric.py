"""Pydantic schemas for Rubric endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.models.rubric import (
    EvaluationCriteria,
    EvaluationType,
    ErrorType,
    MarkingPolicy,
    RubricStatus,
)


class _Base(BaseModel):
    model_config = {"str_strip_whitespace": True, "use_enum_values": True}


# ── Partial marking sub-schemas ───────────────────────────────────────────────

class NumericalToleranceSchema(_Base):
    absolute_tolerance: float = 0.0
    relative_tolerance: float = 0.0
    decimal_precision: int = 2
    rounding_rule: str = "round_half_up"


class FollowThroughSchema(_Base):
    enabled: bool = False
    applicable_steps: list[int] = []
    conditions: str = ""
    max_eligible_marks: float = 0.0
    teacher_explanation: str = ""


class AlternativeMethodSchema(_Base):
    description: str
    expected_result: str
    accepted_expressions: list[str] = []


class ErrorInstructionSchema(_Base):
    error_type: ErrorType
    instruction: str
    marking_policy: MarkingPolicy = MarkingPolicy.PARTIAL_MARKS
    max_marks_deducted: float = 0.0


class PartialMarkingSchema(_Base):
    follow_through: FollowThroughSchema = FollowThroughSchema()
    numerical_tolerance: NumericalToleranceSchema = NumericalToleranceSchema()
    alternative_methods: list[AlternativeMethodSchema] = []
    error_instructions: list[ErrorInstructionSchema] = []
    requires_teacher_review: bool = False


# ── Rubric step ───────────────────────────────────────────────────────────────

class RubricStepCreate(_Base):
    step_number: Annotated[int, Field(ge=1)]
    title: Annotated[str, Field(min_length=1)]
    description: str
    maximum_marks: Annotated[float, Field(gt=0)]
    evaluation_criteria: EvaluationCriteria = EvaluationCriteria.MATHEMATICAL_EQUIVALENCE
    expected_expression: str = ""
    expected_result: str = ""
    accepted_alternatives: list[str] = []
    error_tolerance: float = 0.0
    required: bool = True
    dependency_step_ids: list[str] = []
    marking_policy: MarkingPolicy = MarkingPolicy.FULL_MARKS
    partial_marks_config: PartialMarkingSchema = PartialMarkingSchema()


class RubricStepResponse(_Base):
    step_id: str
    step_number: int
    title: str
    description: str
    maximum_marks: float
    evaluation_criteria: EvaluationCriteria
    expected_expression: str
    expected_result: str
    accepted_alternatives: list[str]
    error_tolerance: float
    required: bool
    dependency_step_ids: list[str]
    marking_policy: MarkingPolicy
    partial_marks_config: PartialMarkingSchema


# ── Rubric ────────────────────────────────────────────────────────────────────

class RubricCreate(_Base):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    description: str = ""
    evaluation_type: EvaluationType = EvaluationType.STEP_WISE
    instructions: str = ""
    steps: list[RubricStepCreate] = []
    partial_marking: PartialMarkingSchema = PartialMarkingSchema()


class RubricUpdate(_Base):
    title: str | None = None
    description: str | None = None
    evaluation_type: EvaluationType | None = None
    instructions: str | None = None
    steps: list[RubricStepCreate] | None = None
    partial_marking: PartialMarkingSchema | None = None


class RubricResponse(_Base):
    id: str
    teacher_id: str
    examination_id: str
    question_id: str
    title: str
    description: str
    total_marks: float
    evaluation_type: EvaluationType
    instructions: str
    steps: list[RubricStepResponse]
    partial_marking: PartialMarkingSchema
    status: RubricStatus
    version: int
    parent_rubric_id: str | None
    created_at: datetime
    updated_at: datetime


class RubricListResponse(_Base):
    rubrics: list[RubricResponse]


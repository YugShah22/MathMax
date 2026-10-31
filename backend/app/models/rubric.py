"""
Rubric domain model — step-wise marking scheme.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class RubricStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class EvaluationType(str, Enum):
    STEP_WISE = "step_wise"
    HOLISTIC = "holistic"
    HYBRID = "hybrid"


class EvaluationCriteria(str, Enum):
    MATHEMATICAL_EQUIVALENCE = "mathematical_equivalence"
    EXACT_MATCH = "exact_match"
    NUMERICAL_TOLERANCE = "numerical_tolerance"
    METHOD_VALIDITY = "method_validity"
    CONCEPTUAL_CRITERION = "conceptual_criterion"
    TEACHER_REVIEW = "teacher_review"


class MarkingPolicy(str, Enum):
    FULL_MARKS = "full_marks"
    PARTIAL_MARKS = "partial_marks"
    ZERO_MARKS = "zero_marks"
    FOLLOW_THROUGH = "follow_through"
    TEACHER_REVIEW = "teacher_review"


class ErrorType(str, Enum):
    CALCULATION = "calculation"
    SIGN = "sign"
    SUBSTITUTION = "substitution"
    CONCEPTUAL = "conceptual"
    METHOD = "method"


# ── Sub-structures ────────────────────────────────────────────────────────────

@dataclass
class NumericalTolerance:
    absolute_tolerance: float = 0.0
    relative_tolerance: float = 0.0
    decimal_precision: int = 2
    rounding_rule: str = "round_half_up"


@dataclass
class FollowThroughConfig:
    enabled: bool = False
    applicable_steps: list[int] = field(default_factory=list)
    conditions: str = ""
    max_eligible_marks: float = 0.0
    teacher_explanation: str = ""


@dataclass
class AlternativeMethod:
    description: str
    expected_result: str
    accepted_expressions: list[str] = field(default_factory=list)


@dataclass
class ErrorInstruction:
    error_type: ErrorType
    instruction: str
    marking_policy: MarkingPolicy = MarkingPolicy.PARTIAL_MARKS
    max_marks_deducted: float = 0.0


@dataclass
class PartialMarkingConfig:
    follow_through: FollowThroughConfig = field(default_factory=FollowThroughConfig)
    numerical_tolerance: NumericalTolerance = field(default_factory=NumericalTolerance)
    alternative_methods: list[AlternativeMethod] = field(default_factory=list)
    error_instructions: list[ErrorInstruction] = field(default_factory=list)
    requires_teacher_review: bool = False


@dataclass
class RubricStep:
    step_id: str
    step_number: int
    title: str
    description: str
    maximum_marks: float
    evaluation_criteria: EvaluationCriteria = EvaluationCriteria.MATHEMATICAL_EQUIVALENCE
    expected_expression: str = ""
    expected_result: str = ""
    accepted_alternatives: list[str] = field(default_factory=list)
    error_tolerance: float = 0.0
    required: bool = True
    dependency_step_ids: list[str] = field(default_factory=list)
    marking_policy: MarkingPolicy = MarkingPolicy.FULL_MARKS
    partial_marks_config: PartialMarkingConfig = field(default_factory=PartialMarkingConfig)


@dataclass
class Rubric:
    id: str
    teacher_id: str
    examination_id: str
    question_id: str
    title: str
    total_marks: float
    steps: list[RubricStep] = field(default_factory=list)
    description: str = ""
    evaluation_type: EvaluationType = EvaluationType.STEP_WISE
    instructions: str = ""
    status: RubricStatus = RubricStatus.DRAFT
    version: int = 1
    parent_rubric_id: str | None = None    # for versioning
    partial_marking: PartialMarkingConfig = field(default_factory=PartialMarkingConfig)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


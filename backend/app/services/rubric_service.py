"""Rubric service — business rules."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.models.rubric import (
    AlternativeMethod, ErrorInstruction, ErrorType, EvaluationCriteria,
    EvaluationType, FollowThroughConfig, MarkingPolicy, NumericalTolerance,
    PartialMarkingConfig, Rubric, RubricStatus, RubricStep,
)
from app.repositories.question_repository import QuestionRepository
from app.repositories.rubric_repository import RubricRepository
from app.schemas.rubric import RubricCreate, RubricUpdate


class RubricError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def _schema_pm_to_domain(pm_schema) -> PartialMarkingConfig:
    from app.models.rubric import FollowThroughConfig, NumericalTolerance, AlternativeMethod, ErrorInstruction, ErrorType, MarkingPolicy
    ft = pm_schema.follow_through
    nt = pm_schema.numerical_tolerance
    return PartialMarkingConfig(
        follow_through=FollowThroughConfig(
            enabled=ft.enabled,
            applicable_steps=ft.applicable_steps,
            conditions=ft.conditions,
            max_eligible_marks=ft.max_eligible_marks,
            teacher_explanation=ft.teacher_explanation,
        ),
        numerical_tolerance=NumericalTolerance(
            absolute_tolerance=nt.absolute_tolerance,
            relative_tolerance=nt.relative_tolerance,
            decimal_precision=nt.decimal_precision,
            rounding_rule=nt.rounding_rule,
        ),
        alternative_methods=[
            AlternativeMethod(
                description=a.description,
                expected_result=a.expected_result,
                accepted_expressions=a.accepted_expressions,
            )
            for a in pm_schema.alternative_methods
        ],
        error_instructions=[
            ErrorInstruction(
                error_type=ErrorType(e.error_type),
                instruction=e.instruction,
                marking_policy=MarkingPolicy(e.marking_policy),
                max_marks_deducted=e.max_marks_deducted,
            )
            for e in pm_schema.error_instructions
        ],
        requires_teacher_review=pm_schema.requires_teacher_review,
    )


def _schema_steps_to_domain(steps_schema) -> list[RubricStep]:
    result = []
    for s in steps_schema:
        result.append(RubricStep(
            step_id=str(uuid.uuid4()),
            step_number=s.step_number,
            title=s.title,
            description=s.description,
            maximum_marks=s.maximum_marks,
            evaluation_criteria=EvaluationCriteria(s.evaluation_criteria),
            expected_expression=s.expected_expression,
            expected_result=s.expected_result,
            accepted_alternatives=s.accepted_alternatives,
            error_tolerance=s.error_tolerance,
            required=s.required,
            dependency_step_ids=s.dependency_step_ids,
            marking_policy=MarkingPolicy(s.marking_policy),
            partial_marks_config=_schema_pm_to_domain(s.partial_marks_config),
        ))
    return result


class RubricService:
    def __init__(self, rubric_repo: RubricRepository, question_repo: QuestionRepository) -> None:
        self._rrepo = rubric_repo
        self._qrepo = question_repo

    def _get_question_or_fail(self, question_id: str, teacher_id: str):
        q = self._qrepo.find_by_id_and_teacher(question_id, teacher_id)
        if not q:
            raise RubricError("Question not found or access denied.", 404)
        return q

    def create(self, question_id: str, teacher_id: str, data: RubricCreate) -> Rubric:
        q = self._get_question_or_fail(question_id, teacher_id)
        steps = _schema_steps_to_domain(data.steps)
        total = sum(s.maximum_marks for s in steps)
        if total > q.maximum_marks + 0.001:
            raise RubricError(
                f"Rubric total marks ({total}) exceed question maximum marks ({q.maximum_marks}).", 422
            )
        rubric = Rubric(
            id="",
            teacher_id=teacher_id,
            examination_id=q.examination_id,
            question_id=question_id,
            title=data.title,
            total_marks=total,
            steps=steps,
            description=data.description,
            evaluation_type=EvaluationType(data.evaluation_type),
            instructions=data.instructions,
            status=RubricStatus.DRAFT,
            version=1,
            partial_marking=_schema_pm_to_domain(data.partial_marking),
        )
        return self._rrepo.create(rubric)

    def get(self, rubric_id: str, teacher_id: str) -> Rubric:
        rubric = self._rrepo.find_by_id_and_teacher(rubric_id, teacher_id)
        if not rubric:
            raise RubricError("Rubric not found or access denied.", 404)
        return rubric

    def list_for_question(self, question_id: str, teacher_id: str) -> list[Rubric]:
        self._get_question_or_fail(question_id, teacher_id)
        return self._rrepo.list_by_question(question_id)

    def update(self, rubric_id: str, teacher_id: str, data: RubricUpdate) -> Rubric:
        rubric = self.get(rubric_id, teacher_id)
        if rubric.status == RubricStatus.ARCHIVED:
            raise RubricError("Archived rubrics cannot be modified.", 400)

        updates: dict = {}
        if data.title is not None:
            updates["title"] = data.title
        if data.description is not None:
            updates["description"] = data.description
        if data.evaluation_type is not None:
            updates["evaluation_type"] = data.evaluation_type
        if data.instructions is not None:
            updates["instructions"] = data.instructions
        if data.steps is not None:
            q = self._qrepo.find_by_id(rubric.question_id)
            steps = _schema_steps_to_domain(data.steps)
            total = sum(s.maximum_marks for s in steps)
            if q and total > q.maximum_marks + 0.001:
                raise RubricError(f"Rubric total marks ({total}) exceed question maximum ({q.maximum_marks}).", 422)
            from app.repositories.rubric_repository import _step_to_doc
            updates["steps"] = [_step_to_doc(s) for s in steps]
        if data.partial_marking is not None:
            from app.repositories.rubric_repository import _pm_to_doc
            updates["partial_marking"] = _pm_to_doc(_schema_pm_to_domain(data.partial_marking))

        if not updates:
            return rubric
        result = self._rrepo.update(rubric_id, teacher_id, updates)
        if not result:
            raise RubricError("Update failed.", 500)
        return result

    def activate(self, rubric_id: str, teacher_id: str) -> Rubric:
        rubric = self.get(rubric_id, teacher_id)
        if not rubric.steps:
            raise RubricError("A rubric must have at least one step before activation.", 422)
        result = self._rrepo.update(rubric_id, teacher_id, {"status": RubricStatus.ACTIVE.value})
        if not result:
            raise RubricError("Activation failed.", 500)
        return result

    def archive(self, rubric_id: str, teacher_id: str) -> Rubric:
        self.get(rubric_id, teacher_id)
        result = self._rrepo.update(rubric_id, teacher_id, {"status": RubricStatus.ARCHIVED.value})
        if not result:
            raise RubricError("Archive failed.", 500)
        return result

    def duplicate(self, rubric_id: str, teacher_id: str, target_question_id: str) -> Rubric:
        rubric = self.get(rubric_id, teacher_id)
        q = self._get_question_or_fail(target_question_id, teacher_id)
        total = rubric.total_marks
        if total > q.maximum_marks + 0.001:
            raise RubricError(
                f"Rubric total marks ({total}) exceed target question maximum ({q.maximum_marks}).", 422
            )
        dup = Rubric(
            id="",
            teacher_id=teacher_id,
            examination_id=q.examination_id,
            question_id=target_question_id,
            title=f"Copy of {rubric.title}",
            total_marks=total,
            steps=[
                RubricStep(
                    step_id=str(uuid.uuid4()),
                    step_number=s.step_number,
                    title=s.title,
                    description=s.description,
                    maximum_marks=s.maximum_marks,
                    evaluation_criteria=EvaluationCriteria(s.evaluation_criteria) if s.evaluation_criteria else EvaluationCriteria.MATHEMATICAL_EQUIVALENCE,
                    expected_expression=s.expected_expression,
                    expected_result=s.expected_result,
                    accepted_alternatives=list(s.accepted_alternatives),
                    error_tolerance=s.error_tolerance,
                    required=s.required,
                    dependency_step_ids=[],
                    marking_policy=MarkingPolicy(s.marking_policy) if s.marking_policy else MarkingPolicy.FULL_MARKS,
                    partial_marks_config=PartialMarkingConfig(),
                )
                for s in rubric.steps
            ],
            description=rubric.description,
            evaluation_type=EvaluationType(rubric.evaluation_type) if rubric.evaluation_type else EvaluationType.STEP_WISE,
            instructions=rubric.instructions,
            status=RubricStatus.DRAFT,
            version=1,
            parent_rubric_id=rubric.id,
            partial_marking=PartialMarkingConfig(),
        )
        return self._rrepo.create(dup)


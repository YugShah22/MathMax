"""Rubric API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies.auth import require_teacher
from app.api.dependencies.phase2 import get_rubric_service
from app.models.user import User
from app.schemas.rubric import (
    RubricCreate,
    RubricListResponse,
    RubricResponse,
    RubricStepResponse,
    RubricUpdate,
    PartialMarkingSchema,
    NumericalToleranceSchema,
    FollowThroughSchema,
    AlternativeMethodSchema,
    ErrorInstructionSchema,
)
from app.services.rubric_service import RubricError, RubricService

router = APIRouter(tags=["Rubrics"])


def _pm_to_schema(pm) -> PartialMarkingSchema:
    ft = pm.follow_through
    nt = pm.numerical_tolerance
    return PartialMarkingSchema(
        follow_through=FollowThroughSchema(
            enabled=ft.enabled,
            applicable_steps=ft.applicable_steps,
            conditions=ft.conditions,
            max_eligible_marks=ft.max_eligible_marks,
            teacher_explanation=ft.teacher_explanation,
        ),
        numerical_tolerance=NumericalToleranceSchema(
            absolute_tolerance=nt.absolute_tolerance,
            relative_tolerance=nt.relative_tolerance,
            decimal_precision=nt.decimal_precision,
            rounding_rule=nt.rounding_rule,
        ),
        alternative_methods=[
            AlternativeMethodSchema(
                description=a.description,
                expected_result=a.expected_result,
                accepted_expressions=a.accepted_expressions,
            )
            for a in pm.alternative_methods
        ],
        error_instructions=[
            ErrorInstructionSchema(
                error_type=e.error_type,
                instruction=e.instruction,
                marking_policy=e.marking_policy,
                max_marks_deducted=e.max_marks_deducted,
            )
            for e in pm.error_instructions
        ],
        requires_teacher_review=pm.requires_teacher_review,
    )


def _to_response(rubric) -> RubricResponse:
    steps = [
        RubricStepResponse(
            step_id=s.step_id,
            step_number=s.step_number,
            title=s.title,
            description=s.description,
            maximum_marks=s.maximum_marks,
            evaluation_criteria=s.evaluation_criteria,
            expected_expression=s.expected_expression,
            expected_result=s.expected_result,
            accepted_alternatives=s.accepted_alternatives,
            error_tolerance=s.error_tolerance,
            required=s.required,
            dependency_step_ids=s.dependency_step_ids,
            marking_policy=s.marking_policy,
            partial_marks_config=_pm_to_schema(s.partial_marks_config),
        )
        for s in rubric.steps
    ]
    return RubricResponse(
        id=rubric.id,
        teacher_id=rubric.teacher_id,
        examination_id=rubric.examination_id,
        question_id=rubric.question_id,
        title=rubric.title,
        description=rubric.description,
        total_marks=rubric.total_marks,
        evaluation_type=rubric.evaluation_type,
        instructions=rubric.instructions,
        steps=steps,
        partial_marking=_pm_to_schema(rubric.partial_marking),
        status=rubric.status,
        version=rubric.version,
        parent_rubric_id=rubric.parent_rubric_id,
        created_at=rubric.created_at,
        updated_at=rubric.updated_at,
    )


class DuplicateRubricBody(BaseModel):
    target_question_id: str


@router.post("/questions/{question_id}/rubrics", response_model=RubricResponse, status_code=201, summary="Create rubric")
def create_rubric(
    question_id: str,
    body: RubricCreate,
    teacher: User = Depends(require_teacher),
    svc: RubricService = Depends(get_rubric_service),
):
    try:
        return _to_response(svc.create(question_id, teacher.id, body))
    except RubricError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get("/questions/{question_id}/rubrics", response_model=RubricListResponse, summary="List rubrics for question")
def list_rubrics(
    question_id: str,
    teacher: User = Depends(require_teacher),
    svc: RubricService = Depends(get_rubric_service),
):
    try:
        rubrics = svc.list_for_question(question_id, teacher.id)
        return RubricListResponse(rubrics=[_to_response(r) for r in rubrics])
    except RubricError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get("/rubrics/{rubric_id}", response_model=RubricResponse, summary="Get rubric")
def get_rubric(
    rubric_id: str,
    teacher: User = Depends(require_teacher),
    svc: RubricService = Depends(get_rubric_service),
):
    try:
        return _to_response(svc.get(rubric_id, teacher.id))
    except RubricError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.patch("/rubrics/{rubric_id}", response_model=RubricResponse, summary="Update rubric")
def update_rubric(
    rubric_id: str,
    body: RubricUpdate,
    teacher: User = Depends(require_teacher),
    svc: RubricService = Depends(get_rubric_service),
):
    try:
        return _to_response(svc.update(rubric_id, teacher.id, body))
    except RubricError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/rubrics/{rubric_id}/activate", response_model=RubricResponse, summary="Activate rubric")
def activate_rubric(
    rubric_id: str,
    teacher: User = Depends(require_teacher),
    svc: RubricService = Depends(get_rubric_service),
):
    try:
        return _to_response(svc.activate(rubric_id, teacher.id))
    except RubricError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/rubrics/{rubric_id}/archive", response_model=RubricResponse, summary="Archive rubric")
def archive_rubric(
    rubric_id: str,
    teacher: User = Depends(require_teacher),
    svc: RubricService = Depends(get_rubric_service),
):
    try:
        return _to_response(svc.archive(rubric_id, teacher.id))
    except RubricError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/rubrics/{rubric_id}/duplicate", response_model=RubricResponse, status_code=201, summary="Duplicate rubric")
def duplicate_rubric(
    rubric_id: str,
    body: DuplicateRubricBody,
    teacher: User = Depends(require_teacher),
    svc: RubricService = Depends(get_rubric_service),
):
    try:
        return _to_response(svc.duplicate(rubric_id, teacher.id, body.target_question_id))
    except RubricError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


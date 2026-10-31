"""Answer-key API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies.auth import require_teacher
from app.api.dependencies.phase2 import get_answer_key_service, get_exam_repo
from app.models.user import User
from app.schemas.answer_key import AnswerKeyCreate, AnswerKeyResponse, AnswerKeyUpdate
from app.services.answer_key_service import AnswerKeyError, AnswerKeyService

router = APIRouter(tags=["Answer Keys"])


def _to_response(ak) -> AnswerKeyResponse:
    from app.schemas.answer_key import ExpectedStepSchema
    return AnswerKeyResponse(
        id=ak.id,
        question_id=ak.question_id,
        examination_id=ak.examination_id,
        teacher_id=ak.teacher_id,
        expected_answer=ak.expected_answer,
        expected_steps=[
            ExpectedStepSchema(
                step_number=s.step_number,
                description=s.description,
                expression=s.expression,
                result=s.result,
            )
            for s in ak.expected_steps
        ],
        mathematical_expression=ak.mathematical_expression,
        expected_final_answer=ak.expected_final_answer,
        accepted_alternatives=ak.accepted_alternatives,
        marking_notes=ak.marking_notes,
        created_at=ak.created_at,
        updated_at=ak.updated_at,
    )


@router.post(
    "/questions/{question_id}/answer-key",
    response_model=AnswerKeyResponse,
    status_code=201,
    summary="Create or replace answer key for a question",
)
def create_answer_key(
    question_id: str,
    body: AnswerKeyCreate,
    teacher: User = Depends(require_teacher),
    svc: AnswerKeyService = Depends(get_answer_key_service),
):
    try:
        return _to_response(svc.create_or_replace(question_id, teacher.id, body))
    except AnswerKeyError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/questions/{question_id}/answer-key",
    response_model=AnswerKeyResponse | None,
    summary="Get answer key for a question",
)
def get_answer_key_for_question(
    question_id: str,
    teacher: User = Depends(require_teacher),
    svc: AnswerKeyService = Depends(get_answer_key_service),
):
    try:
        ak = svc.get_for_question(question_id, teacher.id)
        return _to_response(ak) if ak else None
    except AnswerKeyError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/examinations/{examination_id}/answer-keys",
    response_model=list[AnswerKeyResponse],
    summary="List answer keys for an examination",
)
def list_answer_keys(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: AnswerKeyService = Depends(get_answer_key_service),
):
    return [_to_response(ak) for ak in svc.list_for_examination(examination_id)]


@router.patch(
    "/answer-keys/{answer_key_id}",
    response_model=AnswerKeyResponse,
    summary="Update answer key",
)
def update_answer_key(
    answer_key_id: str,
    body: AnswerKeyUpdate,
    teacher: User = Depends(require_teacher),
    svc: AnswerKeyService = Depends(get_answer_key_service),
):
    try:
        return _to_response(svc.update(answer_key_id, teacher.id, body))
    except AnswerKeyError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


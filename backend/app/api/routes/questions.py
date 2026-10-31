"""Question API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies.auth import require_teacher
from app.api.dependencies.phase2 import get_question_service
from app.models.user import User
from app.schemas.question import (
    QuestionCreate,
    QuestionListResponse,
    QuestionReorderRequest,
    QuestionResponse,
    QuestionUpdate,
)
from app.services.question_service import QuestionError, QuestionService

router = APIRouter(tags=["Questions"])


def _to_response(q) -> QuestionResponse:
    return QuestionResponse(
        id=q.id,
        examination_id=q.examination_id,
        teacher_id=q.teacher_id,
        question_number=q.question_number,
        question_text=q.question_text,
        maximum_marks=q.maximum_marks,
        question_type=q.question_type,
        topic=q.topic,
        difficulty=q.difficulty,
        rubric_id=q.rubric_id,
        expected_answer_ref=q.expected_answer_ref,
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


class DuplicateQuestionBody(BaseModel):
    new_question_number: int


@router.post(
    "/examinations/{examination_id}/questions",
    response_model=QuestionResponse,
    status_code=201,
    summary="Add question to examination",
)
def add_question(
    examination_id: str,
    body: QuestionCreate,
    teacher: User = Depends(require_teacher),
    svc: QuestionService = Depends(get_question_service),
):
    try:
        return _to_response(svc.add(examination_id, teacher.id, body))
    except QuestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get(
    "/examinations/{examination_id}/questions",
    response_model=QuestionListResponse,
    summary="List questions for examination",
)
def list_questions(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: QuestionService = Depends(get_question_service),
):
    try:
        questions = svc.list_for_exam(examination_id, teacher.id)
        total_marks = sum(q.maximum_marks for q in questions)
        return QuestionListResponse(questions=[_to_response(q) for q in questions], total_marks=total_marks)
    except QuestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post(
    "/examinations/{examination_id}/questions/reorder",
    response_model=QuestionListResponse,
    summary="Reorder questions",
)
def reorder_questions(
    examination_id: str,
    body: QuestionReorderRequest,
    teacher: User = Depends(require_teacher),
    svc: QuestionService = Depends(get_question_service),
):
    try:
        questions = svc.reorder(examination_id, teacher.id, body)
        total_marks = sum(q.maximum_marks for q in questions)
        return QuestionListResponse(questions=[_to_response(q) for q in questions], total_marks=total_marks)
    except QuestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get("/questions/{question_id}", response_model=QuestionResponse, summary="Get question")
def get_question(
    question_id: str,
    teacher: User = Depends(require_teacher),
    svc: QuestionService = Depends(get_question_service),
):
    try:
        return _to_response(svc.get(question_id, teacher.id))
    except QuestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.patch("/questions/{question_id}", response_model=QuestionResponse, summary="Update question")
def update_question(
    question_id: str,
    body: QuestionUpdate,
    teacher: User = Depends(require_teacher),
    svc: QuestionService = Depends(get_question_service),
):
    try:
        return _to_response(svc.update(question_id, teacher.id, body))
    except QuestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.delete("/questions/{question_id}", status_code=204, summary="Delete question")
def delete_question(
    question_id: str,
    teacher: User = Depends(require_teacher),
    svc: QuestionService = Depends(get_question_service),
):
    try:
        svc.delete(question_id, teacher.id)
    except QuestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/questions/{question_id}/duplicate", response_model=QuestionResponse, status_code=201, summary="Duplicate question")
def duplicate_question(
    question_id: str,
    body: DuplicateQuestionBody,
    teacher: User = Depends(require_teacher),
    svc: QuestionService = Depends(get_question_service),
):
    try:
        return _to_response(svc.duplicate(question_id, teacher.id, body.new_question_number))
    except QuestionError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


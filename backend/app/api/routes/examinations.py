"""Examination API routes."""
from __future__ import annotations

import math
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.auth import require_teacher
from app.api.dependencies.phase2 import get_exam_service
from app.models.examination import ExaminationStatus
from app.models.user import User
from app.schemas.examination import (
    ExaminationCreate,
    ExaminationListResponse,
    ExaminationResponse,
    ExaminationUpdate,
    PublishValidationResponse,
)
from app.services.examination_service import ExaminationError, ExaminationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/examinations", tags=["Examinations"])


def _to_response(exam) -> ExaminationResponse:
    return ExaminationResponse(
        id=exam.id,
        teacher_id=exam.teacher_id,
        title=exam.title,
        subject=exam.subject,
        total_marks=exam.total_marks,
        duration_minutes=exam.duration_minutes,
        description=exam.description,
        academic_year=exam.academic_year,
        examination_type=exam.examination_type,
        scheduled_at=exam.scheduled_at,
        status=exam.status,
        question_paper_ref=exam.question_paper_ref,
        answer_key_ref=exam.answer_key_ref,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


@router.post("", response_model=ExaminationResponse, status_code=201, summary="Create examination")
def create_examination(
    body: ExaminationCreate,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        return _to_response(svc.create(teacher.id, body))
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get("", response_model=ExaminationListResponse, summary="List examinations")
def list_examinations(
    status: ExaminationStatus | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    exams, total = svc.list_for_teacher(teacher.id, status=status, search=search, page=page, page_size=page_size)
    pages = math.ceil(total / page_size) if total else 0
    return ExaminationListResponse(
        examinations=[_to_response(e) for e in exams],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/dashboard-stats", summary="Teacher dashboard statistics")
def dashboard_stats(
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    return svc.dashboard_stats(teacher.id)


@router.get("/{examination_id}", response_model=ExaminationResponse, summary="Get examination")
def get_examination(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        return _to_response(svc.get_for_teacher(examination_id, teacher.id))
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.patch("/{examination_id}", response_model=ExaminationResponse, summary="Update examination")
def update_examination(
    examination_id: str,
    body: ExaminationUpdate,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        return _to_response(svc.update(examination_id, teacher.id, body))
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.delete("/{examination_id}", status_code=204, summary="Delete examination")
def delete_examination(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        svc.delete(examination_id, teacher.id)
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/{examination_id}/duplicate", response_model=ExaminationResponse, status_code=201, summary="Duplicate examination")
def duplicate_examination(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        return _to_response(svc.duplicate(examination_id, teacher.id))
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/{examination_id}/publish", response_model=ExaminationResponse, summary="Publish examination")
def publish_examination(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        exam, _ = svc.publish(examination_id, teacher.id)
        return _to_response(exam)
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.get("/{examination_id}/publish-check", response_model=PublishValidationResponse, summary="Check publish readiness")
def publish_check(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        can, reasons = svc.check_publish_readiness(examination_id, teacher.id)
        return PublishValidationResponse(can_publish=can, reasons=reasons)
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


@router.post("/{examination_id}/archive", response_model=ExaminationResponse, summary="Archive examination")
def archive_examination(
    examination_id: str,
    teacher: User = Depends(require_teacher),
    svc: ExaminationService = Depends(get_exam_service),
):
    try:
        return _to_response(svc.archive(examination_id, teacher.id))
    except ExaminationError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


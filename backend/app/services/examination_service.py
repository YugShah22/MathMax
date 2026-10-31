"""
Examination service — business rules.
"""
from __future__ import annotations

import logging
import math
from dataclasses import replace
from datetime import datetime, timezone

from app.models.examination import Examination, ExaminationStatus, ExaminationType
from app.models.question import DifficultyLevel, Question, QuestionType
from app.models.answer_key import AnswerKey
from app.models.rubric import EvaluationType, Rubric, RubricStatus
from app.repositories.examination_repository import ExaminationRepository
from app.repositories.question_repository import QuestionRepository
from app.repositories.answer_key_repository import AnswerKeyRepository
from app.repositories.rubric_repository import RubricRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas.examination import ExaminationCreate, ExaminationUpdate
from app.utils.storage import delete_file

logger = logging.getLogger(__name__)


class ExaminationError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class ExaminationService:
    def __init__(
        self,
        repo: ExaminationRepository,
        question_repo: QuestionRepository,
        answer_key_repo: AnswerKeyRepository,
        rubric_repo: RubricRepository,
        document_repo: DocumentRepository | None = None,
    ) -> None:
        self._repo = repo
        self._qrepo = question_repo
        self._akrepo = answer_key_repo
        self._rrepo = rubric_repo
        self._drepo = document_repo

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, teacher_id: str, data: ExaminationCreate) -> Examination:
        exam = Examination(
            id="",  # set by DB
            teacher_id=teacher_id,
            title=data.title,
            subject=data.subject,
            total_marks=data.total_marks,
            duration_minutes=data.duration_minutes,
            description=data.description,
            academic_year=data.academic_year,
            examination_type=ExaminationType(data.examination_type) if data.examination_type else ExaminationType.OTHER,
            scheduled_at=data.scheduled_at,
            status=ExaminationStatus.DRAFT,
        )
        return self._repo.create(exam)

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_for_teacher(self, exam_id: str, teacher_id: str) -> Examination:
        exam = self._repo.find_by_id_and_teacher(exam_id, teacher_id)
        if not exam:
            raise ExaminationError("Examination not found.", 404)
        return exam

    def list_for_teacher(
        self,
        teacher_id: str,
        status: ExaminationStatus | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Examination], int]:
        return self._repo.list_by_teacher(teacher_id, status=status, search=search, page=page, page_size=page_size)

    def dashboard_stats(self, teacher_id: str) -> dict:
        total = sum(
            self._repo.count_by_teacher_and_status(teacher_id, s)
            for s in ExaminationStatus
        )
        return {
            "total": total,
            "draft": self._repo.count_by_teacher_and_status(teacher_id, ExaminationStatus.DRAFT),
            "ready": self._repo.count_by_teacher_and_status(teacher_id, ExaminationStatus.READY),
            "published": self._repo.count_by_teacher_and_status(teacher_id, ExaminationStatus.PUBLISHED),
            "archived": self._repo.count_by_teacher_and_status(teacher_id, ExaminationStatus.ARCHIVED),
        }

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, exam_id: str, teacher_id: str, data: ExaminationUpdate) -> Examination:
        exam = self.get_for_teacher(exam_id, teacher_id)
        if exam.status == ExaminationStatus.ARCHIVED:
            raise ExaminationError("Archived examinations cannot be modified.", 400)

        updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if not updates:
            return exam
        updated = self._repo.update(exam_id, teacher_id, updates)
        if not updated:
            raise ExaminationError("Update failed.", 500)
        return updated

    # ── Status transitions ────────────────────────────────────────────────────

    def publish(self, exam_id: str, teacher_id: str) -> tuple[Examination, list[str]]:
        exam = self.get_for_teacher(exam_id, teacher_id)
        reasons = self._check_publish_readiness(exam)
        if reasons:
            raise ExaminationError(f"Cannot publish: {'; '.join(reasons)}", 422)
        updated = self._repo.update(exam_id, teacher_id, {"status": ExaminationStatus.PUBLISHED.value})
        return updated, []

    def archive(self, exam_id: str, teacher_id: str) -> Examination:
        self.get_for_teacher(exam_id, teacher_id)
        updated = self._repo.update(exam_id, teacher_id, {"status": ExaminationStatus.ARCHIVED.value})
        if not updated:
            raise ExaminationError("Archive failed.", 500)
        return updated

    def check_publish_readiness(self, exam_id: str, teacher_id: str) -> tuple[bool, list[str]]:
        exam = self.get_for_teacher(exam_id, teacher_id)
        reasons = self._check_publish_readiness(exam)
        return len(reasons) == 0, reasons

    def _check_publish_readiness(self, exam: Examination) -> list[str]:
        reasons: list[str] = []
        if exam.status == ExaminationStatus.ARCHIVED:
            reasons.append("Examination is archived.")
            return reasons

        questions = self._qrepo.list_by_examination(exam.id)
        if not questions:
            reasons.append("At least one question is required.")
            return reasons

        total = sum(q.maximum_marks for q in questions)
        if abs(total - exam.total_marks) > 0.01:
            reasons.append(
                f"Question marks ({total}) do not match examination total marks ({exam.total_marks})."
            )

        for q in questions:
            if q.maximum_marks <= 0:
                reasons.append(f"Question {q.question_number} has invalid maximum marks ({q.maximum_marks}).")

            ak = self._akrepo.find_by_question(q.id)
            if not ak or not (ak.expected_answer or ak.expected_final_answer or ak.expected_steps):
                reasons.append(f"Question {q.question_number} is missing an answer key.")

            rubrics = self._rrepo.list_by_question(q.id)
            if not rubrics:
                reasons.append(f"Question {q.question_number} is missing a rubric.")
            else:
                active_rubrics = [r for r in rubrics if r.status == RubricStatus.ACTIVE]
                if not active_rubrics:
                    reasons.append(f"Question {q.question_number} rubric is still in draft or inactive.")
                else:
                    active_r = active_rubrics[0]
                    if not active_r.steps:
                        reasons.append(f"Question {q.question_number} rubric has no steps defined.")
                    else:
                        step_total = sum(s.maximum_marks for s in active_r.steps)
                        if any(s.maximum_marks <= 0 for s in active_r.steps):
                            reasons.append(f"Question {q.question_number} rubric contains step(s) with invalid marks.")
                        if abs(step_total - q.maximum_marks) > 0.01:
                            reasons.append(
                                f"Question {q.question_number} rubric total marks ({step_total}) do not match question marks ({q.maximum_marks})."
                            )

        return reasons

    # ── Duplicate ─────────────────────────────────────────────────────────────

    def duplicate(self, exam_id: str, teacher_id: str) -> Examination:
        exam = self.get_for_teacher(exam_id, teacher_id)
        dup = Examination(
            id="",
            teacher_id=teacher_id,
            title=f"Copy of {exam.title}",
            subject=exam.subject,
            total_marks=exam.total_marks,
            duration_minutes=exam.duration_minutes,
            description=exam.description,
            academic_year=exam.academic_year,
            examination_type=ExaminationType(exam.examination_type) if exam.examination_type else ExaminationType.OTHER,
            status=ExaminationStatus.DRAFT,
        )
        new_exam = self._repo.create(dup)

        questions = self._qrepo.list_by_examination(exam_id)
        for q in questions:
            new_q = Question(
                id="",
                examination_id=new_exam.id,
                teacher_id=teacher_id,
                question_number=q.question_number,
                question_text=q.question_text,
                maximum_marks=q.maximum_marks,
                question_type=QuestionType(q.question_type) if q.question_type else QuestionType.OTHER,
                topic=q.topic,
                difficulty=DifficultyLevel(q.difficulty) if q.difficulty else DifficultyLevel.MEDIUM,
            )
            saved_q = self._qrepo.create(new_q)

            ak = self._akrepo.find_by_question(q.id)
            if ak:
                new_ak = AnswerKey(
                    id="",
                    question_id=saved_q.id,
                    examination_id=new_exam.id,
                    teacher_id=teacher_id,
                    expected_answer=ak.expected_answer,
                    expected_steps=list(ak.expected_steps),
                    mathematical_expression=ak.mathematical_expression,
                    expected_final_answer=ak.expected_final_answer,
                    accepted_alternatives=list(ak.accepted_alternatives),
                    marking_notes=ak.marking_notes,
                )
                saved_ak = self._akrepo.create(new_ak)
                self._qrepo.update(saved_q.id, teacher_id, {"expected_answer_ref": saved_ak.id})

            rubrics = self._rrepo.list_by_question(q.id)
            for r in rubrics:
                new_r = Rubric(
                    id="",
                    teacher_id=teacher_id,
                    examination_id=new_exam.id,
                    question_id=saved_q.id,
                    title=r.title,
                    total_marks=r.total_marks,
                    steps=list(r.steps),
                    description=r.description,
                    evaluation_type=EvaluationType(r.evaluation_type) if r.evaluation_type else EvaluationType.STEP_WISE,
                    instructions=r.instructions,
                    status=RubricStatus(r.status) if r.status else RubricStatus.DRAFT,
                    version=r.version,
                    parent_rubric_id=r.id,
                    partial_marking=r.partial_marking,
                )
                saved_r = self._rrepo.create(new_r)
                if r.status == RubricStatus.ACTIVE:
                    self._qrepo.update(saved_q.id, teacher_id, {"rubric_id": saved_r.id})

        return new_exam

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete(self, exam_id: str, teacher_id: str) -> None:
        exam = self.get_for_teacher(exam_id, teacher_id)
        if exam.status == ExaminationStatus.PUBLISHED:
            raise ExaminationError("Published examinations cannot be deleted. Archive first.", 400)
        if self._drepo:
            docs = self._drepo.list_by_examination(exam_id)
            for doc in docs:
                delete_file(doc.storage_key)
            self._drepo.delete_by_examination(exam_id)
        self._rrepo.delete_by_examination(exam_id)
        self._akrepo.delete_by_examination(exam_id)
        self._qrepo.delete_by_examination(exam_id)
        self._repo.delete(exam_id, teacher_id)


"""Question service — business rules."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.models.question import DifficultyLevel, Question, QuestionType
from app.repositories.examination_repository import ExaminationRepository
from app.repositories.question_repository import QuestionRepository
from app.repositories.answer_key_repository import AnswerKeyRepository
from app.repositories.rubric_repository import RubricRepository
from app.schemas.question import QuestionCreate, QuestionReorderRequest, QuestionUpdate


class QuestionError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class QuestionService:
    def __init__(
        self,
        exam_repo: ExaminationRepository,
        question_repo: QuestionRepository,
        answer_key_repo: AnswerKeyRepository | None = None,
        rubric_repo: RubricRepository | None = None,
    ) -> None:
        self._erepo = exam_repo
        self._qrepo = question_repo
        self._akrepo = answer_key_repo
        self._rrepo = rubric_repo

    def _assert_teacher_owns_exam(self, exam_id: str, teacher_id: str) -> None:
        if not self._erepo.find_by_id_and_teacher(exam_id, teacher_id):
            raise QuestionError("Examination not found or access denied.", 404)

    def add(self, exam_id: str, teacher_id: str, data: QuestionCreate) -> Question:
        self._assert_teacher_owns_exam(exam_id, teacher_id)
        if self._qrepo.number_exists_in_exam(exam_id, data.question_number):
            raise QuestionError(f"Question number {data.question_number} already exists in this examination.", 409)
        q = Question(
            id="",
            examination_id=exam_id,
            teacher_id=teacher_id,
            question_number=data.question_number,
            question_text=data.question_text,
            maximum_marks=data.maximum_marks,
            question_type=QuestionType(data.question_type) if data.question_type else QuestionType.OTHER,
            topic=data.topic,
            difficulty=DifficultyLevel(data.difficulty) if data.difficulty else DifficultyLevel.MEDIUM,
            rubric_id=data.rubric_id,
        )
        return self._qrepo.create(q)

    def get(self, question_id: str, teacher_id: str) -> Question:
        q = self._qrepo.find_by_id_and_teacher(question_id, teacher_id)
        if not q:
            raise QuestionError("Question not found or access denied.", 404)
        return q

    def list_for_exam(self, exam_id: str, teacher_id: str) -> list[Question]:
        self._assert_teacher_owns_exam(exam_id, teacher_id)
        return self._qrepo.list_by_examination(exam_id)

    def update(self, question_id: str, teacher_id: str, data: QuestionUpdate) -> Question:
        q = self.get(question_id, teacher_id)
        updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if not updates:
            return q
        updated = self._qrepo.update(question_id, teacher_id, updates)
        if not updated:
            raise QuestionError("Update failed.", 500)
        return updated

    def delete(self, question_id: str, teacher_id: str) -> None:
        self.get(question_id, teacher_id)
        if self._akrepo:
            self._akrepo.delete_by_question(question_id)
        if self._rrepo:
            self._rrepo.delete_by_question(question_id)
        self._qrepo.delete(question_id, teacher_id)

    def reorder(self, exam_id: str, teacher_id: str, data: QuestionReorderRequest) -> list[Question]:
        self._assert_teacher_owns_exam(exam_id, teacher_id)
        numbers = [item.question_number for item in data.questions]
        if len(numbers) != len(set(numbers)):
            raise QuestionError("Duplicate question numbers in reorder request.", 400)
        for item in data.questions:
            self._qrepo.update(item.question_id, teacher_id, {"question_number": item.question_number})
        return self._qrepo.list_by_examination(exam_id)

    def duplicate(self, question_id: str, teacher_id: str, new_number: int) -> Question:
        q = self.get(question_id, teacher_id)
        if self._qrepo.number_exists_in_exam(q.examination_id, new_number):
            raise QuestionError(f"Question number {new_number} already exists.", 409)
        dup = Question(
            id="",
            examination_id=q.examination_id,
            teacher_id=teacher_id,
            question_number=new_number,
            question_text=q.question_text,
            maximum_marks=q.maximum_marks,
            question_type=QuestionType(q.question_type) if q.question_type else QuestionType.OTHER,
            topic=q.topic,
            difficulty=DifficultyLevel(q.difficulty) if q.difficulty else DifficultyLevel.MEDIUM,
        )
        return self._qrepo.create(dup)


"""Answer-key service — business rules."""
from __future__ import annotations

from app.models.answer_key import AnswerKey, ExpectedStep
from app.repositories.answer_key_repository import AnswerKeyRepository
from app.repositories.question_repository import QuestionRepository
from app.schemas.answer_key import AnswerKeyCreate, AnswerKeyUpdate


class AnswerKeyError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class AnswerKeyService:
    def __init__(self, ak_repo: AnswerKeyRepository, question_repo: QuestionRepository) -> None:
        self._akrepo = ak_repo
        self._qrepo = question_repo

    def _get_question(self, question_id: str, teacher_id: str):
        q = self._qrepo.find_by_id_and_teacher(question_id, teacher_id)
        if not q:
            raise AnswerKeyError("Question not found or access denied.", 404)
        return q

    def create_or_replace(self, question_id: str, teacher_id: str, data: AnswerKeyCreate) -> AnswerKey:
        q = self._get_question(question_id, teacher_id)
        existing = self._akrepo.find_by_question(question_id)

        steps = [
            ExpectedStep(
                step_number=s.step_number,
                description=s.description,
                expression=s.expression,
                result=s.result,
            )
            for s in data.expected_steps
        ]
        if existing:
            updates = {
                "expected_answer": data.expected_answer,
                "expected_steps": [
                    {"step_number": s.step_number, "description": s.description, "expression": s.expression, "result": s.result}
                    for s in steps
                ],
                "mathematical_expression": data.mathematical_expression,
                "expected_final_answer": data.expected_final_answer,
                "accepted_alternatives": data.accepted_alternatives,
                "marking_notes": data.marking_notes,
            }
            result = self._akrepo.update(existing.id, teacher_id, updates)
            if not result:
                raise AnswerKeyError("Update failed.", 500)
            return result

        ak = AnswerKey(
            id="",
            question_id=question_id,
            examination_id=q.examination_id,
            teacher_id=teacher_id,
            expected_answer=data.expected_answer,
            expected_steps=steps,
            mathematical_expression=data.mathematical_expression,
            expected_final_answer=data.expected_final_answer,
            accepted_alternatives=data.accepted_alternatives,
            marking_notes=data.marking_notes,
        )
        return self._akrepo.create(ak)

    def get(self, ak_id: str, teacher_id: str) -> AnswerKey:
        ak = self._akrepo.find_by_id_and_teacher(ak_id, teacher_id)
        if not ak:
            raise AnswerKeyError("Answer key not found or access denied.", 404)
        return ak

    def get_for_question(self, question_id: str, teacher_id: str) -> AnswerKey | None:
        self._get_question(question_id, teacher_id)
        return self._akrepo.find_by_question(question_id)

    def list_for_examination(self, examination_id: str) -> list[AnswerKey]:
        return self._akrepo.list_by_examination(examination_id)

    def update(self, ak_id: str, teacher_id: str, data: AnswerKeyUpdate) -> AnswerKey:
        ak = self.get(ak_id, teacher_id)
        updates = {}
        dump = data.model_dump(exclude_none=True)
        if "expected_steps" in dump:
            updates["expected_steps"] = [
                {"step_number": s["step_number"], "description": s.get("description",""), "expression": s.get("expression",""), "result": s.get("result","")}
                for s in dump.pop("expected_steps")
            ]
        updates.update(dump)
        if not updates:
            return ak
        result = self._akrepo.update(ak_id, teacher_id, updates)
        if not result:
            raise AnswerKeyError("Update failed.", 500)
        return result


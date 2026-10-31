"""
Answer-key repository.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.answer_key import AnswerKey, ExpectedStep

COLLECTION = "answer_keys"


def _doc_to_ak(doc: dict) -> AnswerKey:
    steps = [
        ExpectedStep(
            step_number=s["step_number"],
            description=s.get("description", ""),
            expression=s.get("expression", ""),
            result=s.get("result", ""),
        )
        for s in doc.get("expected_steps", [])
    ]
    return AnswerKey(
        id=str(doc["_id"]),
        question_id=str(doc["question_id"]),
        examination_id=str(doc["examination_id"]),
        teacher_id=str(doc["teacher_id"]),
        expected_answer=doc.get("expected_answer", ""),
        expected_steps=steps,
        mathematical_expression=doc.get("mathematical_expression", ""),
        expected_final_answer=doc.get("expected_final_answer", ""),
        accepted_alternatives=doc.get("accepted_alternatives", []),
        marking_notes=doc.get("marking_notes", ""),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


class AnswerKeyRepository:
    def __init__(self, db: Database) -> None:
        self._col = db[COLLECTION]

    def find_by_question(self, question_id: str) -> AnswerKey | None:
        doc = self._col.find_one({"question_id": ObjectId(question_id)})
        return _doc_to_ak(doc) if doc else None

    def find_by_id(self, ak_id: str) -> AnswerKey | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(ak_id)})
        except Exception:
            return None
        return _doc_to_ak(doc) if doc else None

    def find_by_id_and_teacher(self, ak_id: str, teacher_id: str) -> AnswerKey | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(ak_id), "teacher_id": ObjectId(teacher_id)})
        except Exception:
            return None
        return _doc_to_ak(doc) if doc else None

    def list_by_examination(self, examination_id: str) -> list[AnswerKey]:
        docs = list(self._col.find({"examination_id": ObjectId(examination_id)}))
        return [_doc_to_ak(d) for d in docs]

    def create(self, ak: AnswerKey) -> AnswerKey:
        now = datetime.now(timezone.utc)
        doc = {
            "question_id": ObjectId(ak.question_id),
            "examination_id": ObjectId(ak.examination_id),
            "teacher_id": ObjectId(ak.teacher_id),
            "expected_answer": ak.expected_answer,
            "expected_steps": [
                {"step_number": s.step_number, "description": s.description, "expression": s.expression, "result": s.result}
                for s in ak.expected_steps
            ],
            "mathematical_expression": ak.mathematical_expression,
            "expected_final_answer": ak.expected_final_answer,
            "accepted_alternatives": ak.accepted_alternatives,
            "marking_notes": ak.marking_notes,
            "created_at": now,
            "updated_at": now,
        }
        result = self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_ak(doc)

    def update(self, ak_id: str, teacher_id: str, updates: dict) -> AnswerKey | None:
        updates["updated_at"] = datetime.now(timezone.utc)
        result = self._col.find_one_and_update(
            {"_id": ObjectId(ak_id), "teacher_id": ObjectId(teacher_id)},
            {"$set": updates},
            return_document=True,
        )
        return _doc_to_ak(result) if result else None

    def count_for_examination(self, examination_id: str) -> int:
        return self._col.count_documents({"examination_id": ObjectId(examination_id)})

    def delete_by_question(self, question_id: str) -> int:
        result = self._col.delete_many({"question_id": ObjectId(question_id)})
        return result.deleted_count

    def delete_by_examination(self, examination_id: str) -> int:
        result = self._col.delete_many({"examination_id": ObjectId(examination_id)})
        return result.deleted_count


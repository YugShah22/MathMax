"""
Question repository — MongoDB access for the questions collection.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.question import DifficultyLevel, Question, QuestionType

logger = logging.getLogger(__name__)
COLLECTION = "questions"


def _doc_to_question(doc: dict) -> Question:
    return Question(
        id=str(doc["_id"]),
        examination_id=str(doc["examination_id"]),
        teacher_id=str(doc["teacher_id"]),
        question_number=doc["question_number"],
        question_text=doc["question_text"],
        maximum_marks=doc["maximum_marks"],
        question_type=QuestionType(doc.get("question_type", "other")),
        topic=doc.get("topic", ""),
        difficulty=DifficultyLevel(doc.get("difficulty", "medium")),
        expected_answer_ref=doc.get("expected_answer_ref"),
        rubric_id=doc.get("rubric_id"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


class QuestionRepository:
    def __init__(self, db: Database) -> None:
        self._col = db[COLLECTION]

    def find_by_id(self, question_id: str) -> Question | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(question_id)})
        except Exception:
            return None
        return _doc_to_question(doc) if doc else None

    def find_by_id_and_teacher(self, question_id: str, teacher_id: str) -> Question | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(question_id), "teacher_id": ObjectId(teacher_id)})
        except Exception:
            return None
        return _doc_to_question(doc) if doc else None

    def list_by_examination(self, examination_id: str) -> list[Question]:
        docs = list(self._col.find({"examination_id": ObjectId(examination_id)}).sort("question_number", 1))
        return [_doc_to_question(d) for d in docs]

    def number_exists_in_exam(self, examination_id: str, question_number: int, exclude_id: str | None = None) -> bool:
        query: dict = {"examination_id": ObjectId(examination_id), "question_number": question_number}
        if exclude_id:
            try:
                query["_id"] = {"$ne": ObjectId(exclude_id)}
            except Exception:
                pass
        return self._col.count_documents(query, limit=1) > 0

    def create(self, q: Question) -> Question:
        now = datetime.now(timezone.utc)
        doc = {
            "examination_id": ObjectId(q.examination_id),
            "teacher_id": ObjectId(q.teacher_id),
            "question_number": q.question_number,
            "question_text": q.question_text,
            "maximum_marks": q.maximum_marks,
            "question_type": q.question_type.value if hasattr(q.question_type, 'value') else q.question_type,
            "topic": q.topic,
            "difficulty": q.difficulty.value if hasattr(q.difficulty, 'value') else q.difficulty,
            "expected_answer_ref": q.expected_answer_ref,
            "rubric_id": q.rubric_id,
            "created_at": now,
            "updated_at": now,
        }
        result = self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_question(doc)

    def update(self, question_id: str, teacher_id: str, updates: dict) -> Question | None:
        updates["updated_at"] = datetime.now(timezone.utc)
        result = self._col.find_one_and_update(
            {"_id": ObjectId(question_id), "teacher_id": ObjectId(teacher_id)},
            {"$set": updates},
            return_document=True,
        )
        return _doc_to_question(result) if result else None

    def delete(self, question_id: str, teacher_id: str) -> bool:
        result = self._col.delete_one({"_id": ObjectId(question_id), "teacher_id": ObjectId(teacher_id)})
        return result.deleted_count > 0

    def delete_by_examination(self, examination_id: str) -> int:
        result = self._col.delete_many({"examination_id": ObjectId(examination_id)})
        return result.deleted_count

    def sum_marks_for_examination(self, examination_id: str) -> float:
        pipeline = [
            {"$match": {"examination_id": ObjectId(examination_id)}},
            {"$group": {"_id": None, "total": {"$sum": "$maximum_marks"}}},
        ]
        result = list(self._col.aggregate(pipeline))
        return result[0]["total"] if result else 0.0


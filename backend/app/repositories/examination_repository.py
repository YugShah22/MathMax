"""
Examination repository — MongoDB access for the examinations collection.
"""
from __future__ import annotations

import logging
import math
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.collection import Collection
from pymongo.database import Database

from app.models.examination import Examination, ExaminationStatus, ExaminationType

logger = logging.getLogger(__name__)
COLLECTION = "examinations"


def _doc_to_exam(doc: dict) -> Examination:
    return Examination(
        id=str(doc["_id"]),
        teacher_id=str(doc["teacher_id"]),
        title=doc["title"],
        subject=doc["subject"],
        total_marks=doc["total_marks"],
        duration_minutes=doc["duration_minutes"],
        description=doc.get("description", ""),
        academic_year=doc.get("academic_year", ""),
        examination_type=ExaminationType(doc.get("examination_type", "other")),
        scheduled_at=doc.get("scheduled_at"),
        status=ExaminationStatus(doc.get("status", "draft")),
        question_paper_ref=doc.get("question_paper_ref"),
        answer_key_ref=doc.get("answer_key_ref"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


class ExaminationRepository:
    def __init__(self, db: Database) -> None:
        self._col: Collection = db[COLLECTION]

    # ── Reads ─────────────────────────────────────────────────────────────────

    def find_by_id(self, exam_id: str) -> Examination | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(exam_id)})
        except Exception:
            return None
        return _doc_to_exam(doc) if doc else None

    def find_by_id_and_teacher(self, exam_id: str, teacher_id: str) -> Examination | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(exam_id), "teacher_id": ObjectId(teacher_id)})
        except Exception:
            return None
        return _doc_to_exam(doc) if doc else None

    def list_by_teacher(
        self,
        teacher_id: str,
        status: ExaminationStatus | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Examination], int]:
        query: dict = {"teacher_id": ObjectId(teacher_id)}
        if status:
            query["status"] = status.value
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"subject": {"$regex": search, "$options": "i"}},
            ]
        total = self._col.count_documents(query)
        skip = (page - 1) * page_size
        docs = list(self._col.find(query).sort("created_at", -1).skip(skip).limit(page_size))
        return [_doc_to_exam(d) for d in docs], total

    def count_by_teacher_and_status(self, teacher_id: str, status: ExaminationStatus) -> int:
        return self._col.count_documents({"teacher_id": ObjectId(teacher_id), "status": status.value})

    # ── Writes ────────────────────────────────────────────────────────────────

    def create(self, exam: Examination) -> Examination:
        now = datetime.now(timezone.utc)
        doc = {
            "teacher_id": ObjectId(exam.teacher_id),
            "title": exam.title,
            "subject": exam.subject,
            "total_marks": exam.total_marks,
            "duration_minutes": exam.duration_minutes,
            "description": exam.description,
            "academic_year": exam.academic_year,
            "examination_type": exam.examination_type.value if hasattr(exam.examination_type, 'value') else exam.examination_type,
            "scheduled_at": exam.scheduled_at,
            "status": exam.status.value if hasattr(exam.status, 'value') else exam.status,
            "question_paper_ref": exam.question_paper_ref,
            "answer_key_ref": exam.answer_key_ref,
            "created_at": now,
            "updated_at": now,
        }
        result = self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_exam(doc)

    def update(self, exam_id: str, teacher_id: str, updates: dict) -> Examination | None:
        updates["updated_at"] = datetime.now(timezone.utc)
        result = self._col.find_one_and_update(
            {"_id": ObjectId(exam_id), "teacher_id": ObjectId(teacher_id)},
            {"$set": updates},
            return_document=True,
        )
        return _doc_to_exam(result) if result else None

    def delete(self, exam_id: str, teacher_id: str) -> bool:
        result = self._col.delete_one({"_id": ObjectId(exam_id), "teacher_id": ObjectId(teacher_id)})
        return result.deleted_count > 0


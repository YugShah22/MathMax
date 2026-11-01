"""
Document repository — metadata for uploaded files, answer sheets, and question papers.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.document import Document, DocumentStatus, DocumentType

COLLECTION = "documents"


def _doc_to_document(doc: dict) -> Document:
    return Document(
        id=str(doc["_id"]),
        examination_id=str(doc["examination_id"]),
        teacher_id=str(doc["teacher_id"]) if doc.get("teacher_id") else None,
        student_id=str(doc["student_id"]) if doc.get("student_id") else None,
        submission_id=str(doc["submission_id"]) if doc.get("submission_id") else None,
        original_filename=doc.get("original_filename", ""),
        stored_filename=doc.get("stored_filename", ""),
        content_type=doc.get("content_type", "application/octet-stream"),
        file_size=doc.get("file_size", 0),
        storage_key=doc.get("storage_key", ""),
        document_type=DocumentType(doc.get("document_type", DocumentType.SUPPORTING.value)),
        status=DocumentStatus(doc.get("status", DocumentStatus.UPLOADED.value)),
        page_count=doc.get("page_count", 0),
        processing_error=doc.get("processing_error"),
        processing_started_at=doc.get("processing_started_at"),
        processing_completed_at=doc.get("processing_completed_at"),
        uploaded_at=doc.get("uploaded_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", doc.get("uploaded_at", datetime.now(timezone.utc))),
    )


class DocumentRepository:
    def __init__(self, db: Database) -> None:
        self._col = db[COLLECTION]

    def find_by_id(self, doc_id: str) -> Document | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(doc_id)})
        except Exception:
            return None
        return _doc_to_document(doc) if doc else None

    def find_by_id_and_teacher(self, doc_id: str, teacher_id: str) -> Document | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(doc_id), "teacher_id": ObjectId(teacher_id)})
        except Exception:
            return None
        return _doc_to_document(doc) if doc else None

    def find_by_id_and_student(self, doc_id: str, student_id: str) -> Document | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(doc_id), "student_id": ObjectId(student_id)})
        except Exception:
            return None
        return _doc_to_document(doc) if doc else None

    def create(self, document: Document) -> Document:
        now = datetime.now(timezone.utc)
        raw = {
            "examination_id": ObjectId(document.examination_id),
            "original_filename": document.original_filename,
            "stored_filename": document.stored_filename,
            "content_type": document.content_type,
            "file_size": document.file_size,
            "storage_key": document.storage_key,
            "document_type": document.document_type.value if hasattr(document.document_type, "value") else document.document_type,
            "status": document.status.value if hasattr(document.status, "value") else document.status,
            "page_count": document.page_count,
            "processing_error": document.processing_error,
            "processing_started_at": document.processing_started_at,
            "processing_completed_at": document.processing_completed_at,
            "uploaded_at": now,
            "updated_at": now,
        }
        if document.teacher_id:
            raw["teacher_id"] = ObjectId(document.teacher_id)
        if document.student_id:
            raw["student_id"] = ObjectId(document.student_id)
        if document.submission_id:
            raw["submission_id"] = ObjectId(document.submission_id)

        result = self._col.insert_one(raw)
        raw["_id"] = result.inserted_id
        return _doc_to_document(raw)

    def update(self, doc_id: str, updates: dict) -> Document | None:
        try:
            oid = ObjectId(doc_id)
        except Exception:
            return None

        clean: dict = {}
        for k, v in updates.items():
            if k in ("examination_id", "teacher_id", "student_id", "submission_id") and v:
                clean[k] = ObjectId(v)
            elif k in ("document_type", "status") and hasattr(v, "value"):
                clean[k] = v.value
            else:
                clean[k] = v
        clean["updated_at"] = datetime.now(timezone.utc)

        doc = self._col.find_one_and_update(
            {"_id": oid},
            {"$set": clean},
            return_document=True,
        )
        return _doc_to_document(doc) if doc else None

    def delete(self, doc_id: str, teacher_id: str | None = None) -> bool:
        try:
            query: dict = {"_id": ObjectId(doc_id)}
            if teacher_id:
                query["teacher_id"] = ObjectId(teacher_id)
            result = self._col.delete_one(query)
            return result.deleted_count > 0
        except Exception:
            return False

    def list_by_examination(
        self,
        examination_id: str,
        doc_type: DocumentType | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> list[Document]:
        query: dict = {"examination_id": ObjectId(examination_id)}
        if doc_type:
            query["document_type"] = doc_type.value if hasattr(doc_type, "value") else doc_type

        docs = list(
            self._col.find(query)
            .sort("uploaded_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        return [_doc_to_document(d) for d in docs]

    def count_by_examination(self, examination_id: str, doc_type: DocumentType | None = None) -> int:
        query: dict = {"examination_id": ObjectId(examination_id)}
        if doc_type:
            query["document_type"] = doc_type.value if hasattr(doc_type, "value") else doc_type
        return self._col.count_documents(query)

    def list_by_student(
        self,
        student_id: str,
        examination_id: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> list[Document]:
        query: dict = {"student_id": ObjectId(student_id)}
        if examination_id:
            query["examination_id"] = ObjectId(examination_id)

        docs = list(
            self._col.find(query)
            .sort("uploaded_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        return [_doc_to_document(d) for d in docs]

    def count_by_student(self, student_id: str, examination_id: str | None = None) -> int:
        query: dict = {"student_id": ObjectId(student_id)}
        if examination_id:
            query["examination_id"] = ObjectId(examination_id)
        return self._col.count_documents(query)

    def delete_by_examination(self, examination_id: str) -> int:
        result = self._col.delete_many({"examination_id": ObjectId(examination_id)})
        return result.deleted_count

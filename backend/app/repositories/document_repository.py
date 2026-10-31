"""
Document repository — metadata for uploaded files.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.document import Document, DocumentType

COLLECTION = "documents"


def _doc_to_document(doc: dict) -> Document:
    return Document(
        id=str(doc["_id"]),
        examination_id=str(doc["examination_id"]),
        teacher_id=str(doc["teacher_id"]),
        original_filename=doc["original_filename"],
        stored_filename=doc["stored_filename"],
        content_type=doc["content_type"],
        file_size=doc["file_size"],
        storage_key=doc["storage_key"],
        document_type=DocumentType(doc.get("document_type", "supporting")),
        uploaded_at=doc.get("uploaded_at", datetime.now(timezone.utc)),
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

    def create(self, document: Document) -> Document:
        now = datetime.now(timezone.utc)
        raw = {
            "examination_id": ObjectId(document.examination_id),
            "teacher_id": ObjectId(document.teacher_id),
            "original_filename": document.original_filename,
            "stored_filename": document.stored_filename,
            "content_type": document.content_type,
            "file_size": document.file_size,
            "storage_key": document.storage_key,
            "document_type": document.document_type.value if hasattr(document.document_type, 'value') else document.document_type,
            "uploaded_at": now,
        }
        result = self._col.insert_one(raw)
        raw["_id"] = result.inserted_id
        return _doc_to_document(raw)

    def delete(self, doc_id: str, teacher_id: str) -> bool:
        result = self._col.delete_one({"_id": ObjectId(doc_id), "teacher_id": ObjectId(teacher_id)})
        return result.deleted_count > 0

    def list_by_examination(self, examination_id: str) -> list[Document]:
        docs = list(self._col.find({"examination_id": ObjectId(examination_id)}))
        return [_doc_to_document(d) for d in docs]

    def delete_by_examination(self, examination_id: str) -> int:
        result = self._col.delete_many({"examination_id": ObjectId(examination_id)})
        return result.deleted_count


"""
Document Page repository — metadata for extracted/registered answer sheet pages.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.document_page import DocumentPage, PageStatus

COLLECTION = "document_pages"


def _doc_to_page(doc: dict) -> DocumentPage:
    return DocumentPage(
        id=str(doc["_id"]),
        document_id=str(doc["document_id"]),
        examination_id=str(doc["examination_id"]),
        student_id=str(doc["student_id"]) if doc.get("student_id") else None,
        page_number=doc.get("page_number", 1),
        original_width=doc.get("original_width", 0),
        original_height=doc.get("original_height", 0),
        image_format=doc.get("image_format", "PNG"),
        file_size=doc.get("file_size", 0),
        storage_key=doc.get("storage_key", ""),
        status=PageStatus(doc.get("status", PageStatus.PENDING.value)),
        error_message=doc.get("error_message"),
        processing_started_at=doc.get("processing_started_at"),
        processing_completed_at=doc.get("processing_completed_at"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", doc.get("created_at", datetime.now(timezone.utc))),
    )


class DocumentPageRepository:
    def __init__(self, db: Database) -> None:
        self._col = db[COLLECTION]

    def find_by_id(self, page_id: str) -> DocumentPage | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(page_id)})
        except Exception:
            return None
        return _doc_to_page(doc) if doc else None

    def list_by_document(self, document_id: str) -> list[DocumentPage]:
        try:
            docs = list(self._col.find({"document_id": ObjectId(document_id)}).sort("page_number", 1))
            return [_doc_to_page(d) for d in docs]
        except Exception:
            return []

    def list_by_examination(self, examination_id: str) -> list[DocumentPage]:
        try:
            docs = list(self._col.find({"examination_id": ObjectId(examination_id)}).sort("page_number", 1))
            return [_doc_to_page(d) for d in docs]
        except Exception:
            return []

    def create(self, page: DocumentPage) -> DocumentPage:
        now = datetime.now(timezone.utc)
        raw = {
            "document_id": ObjectId(page.document_id),
            "examination_id": ObjectId(page.examination_id),
            "page_number": page.page_number,
            "original_width": page.original_width,
            "original_height": page.original_height,
            "image_format": page.image_format,
            "file_size": page.file_size,
            "storage_key": page.storage_key,
            "status": page.status.value if hasattr(page.status, "value") else page.status,
            "error_message": page.error_message,
            "processing_started_at": page.processing_started_at,
            "processing_completed_at": page.processing_completed_at,
            "created_at": now,
            "updated_at": now,
        }
        if page.student_id:
            raw["student_id"] = ObjectId(page.student_id)

        result = self._col.insert_one(raw)
        raw["_id"] = result.inserted_id
        return _doc_to_page(raw)

    def create_many(self, pages: list[DocumentPage]) -> list[DocumentPage]:
        if not pages:
            return []
        now = datetime.now(timezone.utc)
        raw_list = []
        for p in pages:
            item = {
                "document_id": ObjectId(p.document_id),
                "examination_id": ObjectId(p.examination_id),
                "page_number": p.page_number,
                "original_width": p.original_width,
                "original_height": p.original_height,
                "image_format": p.image_format,
                "file_size": p.file_size,
                "storage_key": p.storage_key,
                "status": p.status.value if hasattr(p.status, "value") else p.status,
                "error_message": p.error_message,
                "processing_started_at": p.processing_started_at,
                "processing_completed_at": p.processing_completed_at,
                "created_at": now,
                "updated_at": now,
            }
            if p.student_id:
                item["student_id"] = ObjectId(p.student_id)
            raw_list.append(item)

        result = self._col.insert_many(raw_list)
        for i, inserted_id in enumerate(result.inserted_ids):
            raw_list[i]["_id"] = inserted_id
        return [_doc_to_page(r) for r in raw_list]

    def update_status(
        self,
        page_id: str,
        status: PageStatus,
        error_message: str | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
    ) -> DocumentPage | None:
        try:
            oid = ObjectId(page_id)
        except Exception:
            return None

        updates: dict = {
            "status": status.value if hasattr(status, "value") else status,
            "updated_at": datetime.now(timezone.utc),
        }
        if error_message is not None:
            updates["error_message"] = error_message
        if started_at:
            updates["processing_started_at"] = started_at
        if completed_at:
            updates["processing_completed_at"] = completed_at

        doc = self._col.find_one_and_update(
            {"_id": oid},
            {"$set": updates},
            return_document=True,
        )
        return _doc_to_page(doc) if doc else None

    def delete_by_document(self, document_id: str) -> int:
        try:
            result = self._col.delete_many({"document_id": ObjectId(document_id)})
            return result.deleted_count
        except Exception:
            return 0

    def delete_by_examination(self, examination_id: str) -> int:
        try:
            result = self._col.delete_many({"examination_id": ObjectId(examination_id)})
            return result.deleted_count
        except Exception:
            return 0


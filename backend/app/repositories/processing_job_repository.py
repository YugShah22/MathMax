"""
Processing Job repository — tracking asynchronous processing tasks and retries.
"""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.processing_job import JobStatus, ProcessingJob, ProcessingStage

COLLECTION = "processing_jobs"


def _doc_to_job(doc: dict) -> ProcessingJob:
    return ProcessingJob(
        id=str(doc["_id"]),
        document_id=str(doc["document_id"]),
        examination_id=str(doc["examination_id"]),
        student_id=str(doc["student_id"]) if doc.get("student_id") else None,
        stage=ProcessingStage(doc.get("stage", ProcessingStage.PAGE_EXTRACTION.value)),
        status=JobStatus(doc.get("status", JobStatus.QUEUED.value)),
        total_pages=doc.get("total_pages", 0),
        processed_pages=doc.get("processed_pages", 0),
        failed_pages=doc.get("failed_pages", 0),
        error_message=doc.get("error_message"),
        retry_count=doc.get("retry_count", 0),
        max_retries=doc.get("max_retries", 3),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        started_at=doc.get("started_at"),
        completed_at=doc.get("completed_at"),
        updated_at=doc.get("updated_at", doc.get("created_at", datetime.now(timezone.utc))),
    )


class ProcessingJobRepository:
    def __init__(self, db: Database) -> None:
        self._col = db[COLLECTION]

    def find_by_id(self, job_id: str) -> ProcessingJob | None:
        try:
            doc = self._col.find_one({"_id": ObjectId(job_id)})
        except Exception:
            return None
        return _doc_to_job(doc) if doc else None

    def find_latest_by_document(self, document_id: str) -> ProcessingJob | None:
        try:
            doc = self._col.find_one(
                {"document_id": ObjectId(document_id)},
                sort=[("created_at", -1)],
            )
            return _doc_to_job(doc) if doc else None
        except Exception:
            return None

    def list_by_document(self, document_id: str) -> list[ProcessingJob]:
        try:
            docs = list(self._col.find({"document_id": ObjectId(document_id)}).sort("created_at", -1))
            return [_doc_to_job(d) for d in docs]
        except Exception:
            return []

    def list_by_examination(self, examination_id: str) -> list[ProcessingJob]:
        try:
            docs = list(self._col.find({"examination_id": ObjectId(examination_id)}).sort("created_at", -1))
            return [_doc_to_job(d) for d in docs]
        except Exception:
            return []

    def create(self, job: ProcessingJob) -> ProcessingJob:
        now = datetime.now(timezone.utc)
        raw = {
            "document_id": ObjectId(job.document_id),
            "examination_id": ObjectId(job.examination_id),
            "stage": job.stage.value if hasattr(job.stage, "value") else job.stage,
            "status": job.status.value if hasattr(job.status, "value") else job.status,
            "total_pages": job.total_pages,
            "processed_pages": job.processed_pages,
            "failed_pages": job.failed_pages,
            "error_message": job.error_message,
            "retry_count": job.retry_count,
            "max_retries": job.max_retries,
            "created_at": now,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
            "updated_at": now,
        }
        if job.student_id:
            raw["student_id"] = ObjectId(job.student_id)

        result = self._col.insert_one(raw)
        raw["_id"] = result.inserted_id
        return _doc_to_job(raw)

    def update(self, job_id: str, updates: dict) -> ProcessingJob | None:
        try:
            oid = ObjectId(job_id)
        except Exception:
            return None

        clean: dict = {}
        for k, v in updates.items():
            if k in ("stage", "status") and hasattr(v, "value"):
                clean[k] = v.value
            else:
                clean[k] = v
        clean["updated_at"] = datetime.now(timezone.utc)

        doc = self._col.find_one_and_update(
            {"_id": oid},
            {"$set": clean},
            return_document=True,
        )
        return _doc_to_job(doc) if doc else None

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


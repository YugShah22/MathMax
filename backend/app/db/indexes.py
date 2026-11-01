"""
Database index management.

Call ensure_indexes() once at startup (after connect_to_mongo) to create
or update all indexes without blocking. PyMongo is idempotent on identical
index definitions — safe to call every startup.
"""
from __future__ import annotations

import logging

from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.database import Database
from pymongo.errors import OperationFailure

logger = logging.getLogger(__name__)


def _safe_create_indexes(collection, models: list[IndexModel]) -> None:
    """Create indexes safely, handling existing index name conflicts from legacy schemas (e.g. Mongoose)."""
    for model in models:
        try:
            collection.create_indexes([model])
        except OperationFailure as e:
            if e.code == 85:  # IndexOptionsConflict
                logger.info(
                    "Index on %s already exists with compatible key: %s. Preserving existing index.",
                    collection.name,
                    getattr(e, "details", {}).get("errmsg", str(e)),
                )
            else:
                raise


def ensure_indexes(db: Database) -> None:
    """Create all required indexes. Safe to call on every startup."""
    _users_indexes(db)
    _examinations_indexes(db)
    _questions_indexes(db)
    _answer_keys_indexes(db)
    _rubrics_indexes(db)
    _documents_indexes(db)
    _document_pages_indexes(db)
    _processing_jobs_indexes(db)
    logger.info("Database indexes verified.")


# ── Users ────────────────────────────────────────────────────────────────────

def _users_indexes(db: Database) -> None:
    _safe_create_indexes(db["users"], [
        IndexModel([("email", ASCENDING)], unique=True, name="ux_users_email"),
        IndexModel([("role", ASCENDING)], name="ix_users_role"),
        IndexModel([("is_active", ASCENDING)], name="ix_users_is_active"),
        IndexModel(
            [("created_at", DESCENDING)],
            name="ix_users_created_at",
        ),
    ])


# ── Examinations ─────────────────────────────────────────────────────────────

def _examinations_indexes(db: Database) -> None:
    _safe_create_indexes(db["examinations"], [
        IndexModel([("teacher_id", ASCENDING)], name="ix_examinations_teacher_id"),
        IndexModel([("status", ASCENDING)], name="ix_examinations_status"),
        IndexModel([("teacher_id", ASCENDING), ("status", ASCENDING)], name="ix_examinations_teacher_status"),
        IndexModel([("created_at", DESCENDING)], name="ix_examinations_created_at"),
    ])


# ── Questions ─────────────────────────────────────────────────────────────────

def _questions_indexes(db: Database) -> None:
    _safe_create_indexes(db["questions"], [
        IndexModel([("examination_id", ASCENDING)], name="ix_questions_examination_id"),
        IndexModel([("teacher_id", ASCENDING)], name="ix_questions_teacher_id"),
        IndexModel([("examination_id", ASCENDING), ("question_number", ASCENDING)], name="ix_questions_exam_number"),
    ])


# ── Answer Keys ───────────────────────────────────────────────────────────────

def _answer_keys_indexes(db: Database) -> None:
    _safe_create_indexes(db["answer_keys"], [
        IndexModel([("question_id", ASCENDING)], name="ix_answer_keys_question_id"),
        IndexModel([("examination_id", ASCENDING)], name="ix_answer_keys_examination_id"),
        IndexModel([("teacher_id", ASCENDING)], name="ix_answer_keys_teacher_id"),
    ])


# ── Rubrics ───────────────────────────────────────────────────────────────────

def _rubrics_indexes(db: Database) -> None:
    _safe_create_indexes(db["rubrics"], [
        IndexModel([("question_id", ASCENDING)], name="ix_rubrics_question_id"),
        IndexModel([("examination_id", ASCENDING)], name="ix_rubrics_examination_id"),
        IndexModel([("teacher_id", ASCENDING)], name="ix_rubrics_teacher_id"),
        IndexModel([("status", ASCENDING)], name="ix_rubrics_status"),
    ])


# ── Documents ─────────────────────────────────────────────────────────────────

def _documents_indexes(db: Database) -> None:
    _safe_create_indexes(db["documents"], [
        IndexModel([("examination_id", ASCENDING)], name="ix_documents_examination_id"),
        IndexModel([("teacher_id", ASCENDING)], name="ix_documents_teacher_id"),
        IndexModel([("student_id", ASCENDING)], name="ix_documents_student_id"),
        IndexModel([("submission_id", ASCENDING)], name="ix_documents_submission_id"),
        IndexModel([("document_type", ASCENDING)], name="ix_documents_type"),
        IndexModel([("status", ASCENDING)], name="ix_documents_status"),
        IndexModel([("examination_id", ASCENDING), ("student_id", ASCENDING)], name="ix_documents_exam_student"),
        IndexModel([("created_at", DESCENDING)], name="ix_documents_created_at"),
    ])


# ── Document Pages ────────────────────────────────────────────────────────────

def _document_pages_indexes(db: Database) -> None:
    _safe_create_indexes(db["document_pages"], [
        IndexModel([("document_id", ASCENDING)], name="ix_doc_pages_document_id"),
        IndexModel([("examination_id", ASCENDING)], name="ix_doc_pages_examination_id"),
        IndexModel([("student_id", ASCENDING)], name="ix_doc_pages_student_id"),
        IndexModel([("document_id", ASCENDING), ("page_number", ASCENDING)], unique=True, name="ux_doc_pages_doc_num"),
        IndexModel([("status", ASCENDING)], name="ix_doc_pages_status"),
    ])


# ── Processing Jobs ───────────────────────────────────────────────────────────

def _processing_jobs_indexes(db: Database) -> None:
    _safe_create_indexes(db["processing_jobs"], [
        IndexModel([("document_id", ASCENDING)], name="ix_proc_jobs_document_id"),
        IndexModel([("examination_id", ASCENDING)], name="ix_proc_jobs_examination_id"),
        IndexModel([("student_id", ASCENDING)], name="ix_proc_jobs_student_id"),
        IndexModel([("status", ASCENDING)], name="ix_proc_jobs_status"),
        IndexModel([("created_at", DESCENDING)], name="ix_proc_jobs_created_at"),
    ])

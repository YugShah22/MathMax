"""
Database index management.

Call ensure_indexes() once at startup (after connect_to_mongo) to create
or update all indexes without blocking. PyMongo is idempotent on identical
index definitions — safe to call every startup.

Planned collections and their purposes
---------------------------------------
users            — All system users (teachers, students, admins).
examinations     — Examination / test events created by teachers.
questions        — Individual question records within an examination.
answer_keys      — Teacher-supplied correct answers per question.
rubrics          — Marking schemes with step-level criteria and tolerances.
submissions      — Student answer-sheet upload records.
submission_pages — Per-page segments of a submission for OCR processing.
question_regions — Bounding-box coordinates of each question on a page.
ocr_results      — Raw and cleaned OCR text from Gemini / Pix2Text passes.
evaluation_results — Final per-question marks and step analysis records.
feedback         — AI-generated and teacher-written feedback per submission.
review_records   — Teacher manual review / override actions.
analytics        — Aggregated topic and performance analytics snapshots.
audit_logs       — Immutable log of sensitive operations (grading, overrides).
"""
from __future__ import annotations

import logging

from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.database import Database

logger = logging.getLogger(__name__)


def ensure_indexes(db: Database) -> None:
    """Create all required indexes. Safe to call on every startup."""
    _users_indexes(db)
    logger.info("Database indexes verified.")


# ── Users ────────────────────────────────────────────────────────────────────

def _users_indexes(db: Database) -> None:
    db["users"].create_indexes([
        IndexModel([("email", ASCENDING)], unique=True, name="ux_users_email"),
        IndexModel([("role", ASCENDING)], name="ix_users_role"),
        IndexModel([("is_active", ASCENDING)], name="ix_users_is_active"),
        IndexModel(
            [("created_at", DESCENDING)],
            name="ix_users_created_at",
        ),
    ])


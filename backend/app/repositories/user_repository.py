"""
User repository — all MongoDB interactions for the users collection.

Business logic does NOT live here. This layer is responsible only for
translating between domain objects and MongoDB documents.

Password-field migration note
─────────────────────────────
Legacy accounts registered via the pre-Phase-3.1 Next.js Mongoose stack store
the bcrypt hash under the key ``passwordHash`` (camelCase).

Accounts registered via FastAPI (Phase 1 onward) store it under the key
``password_hash`` (snake_case) and also carry ``is_active`` / ``status`` /
``created_at`` / ``updated_at`` fields that the Mongoose schema does not write.

``_doc_to_user()`` transparently reads whichever key is present so that legacy
users can authenticate immediately through FastAPI without any data-mutation
migration.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.collection import Collection
from pymongo.database import Database

from app.models.user import AccountStatus, User, UserRole

logger = logging.getLogger(__name__)

COLLECTION = "users"


def _doc_to_user(doc: dict) -> User:
    """
    Convert a raw MongoDB document to a User domain object.

    Handles both legacy Mongoose documents (field: ``passwordHash``) and
    modern PyMongo documents (field: ``password_hash``).
    """
    # ── Password hash: support both legacy camelCase and modern snake_case ──
    password_hash: str = doc.get("password_hash") or doc.get("passwordHash", "")

    return User(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        password_hash=password_hash,
        role=UserRole(doc["role"]),
        is_active=doc.get("is_active", True),
        status=AccountStatus(doc.get("status", AccountStatus.ACTIVE)),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
    )


def _collection(db: Database) -> Collection:
    return db[COLLECTION]


class UserRepository:
    """Data access object for the users collection."""

    def __init__(self, db: Database) -> None:
        self._col = _collection(db)

    # ── Reads ─────────────────────────────────────────────────────────────────

    def find_by_email(self, email: str) -> User | None:
        """Return the user with the given email, or None."""
        doc = self._col.find_one({"email": email.lower().strip()})
        return _doc_to_user(doc) if doc else None

    def find_by_id(self, user_id: str) -> User | None:
        """Return the user with the given ObjectId string, or None."""
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = self._col.find_one({"_id": oid})
        return _doc_to_user(doc) if doc else None

    def email_exists(self, email: str) -> bool:
        """Return True if any user with this email already exists."""
        return self._col.count_documents({"email": email.lower().strip()}, limit=1) > 0

    # ── Writes ────────────────────────────────────────────────────────────────

    def create(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        role: UserRole,
    ) -> User:
        """Insert a new user document and return the created User."""
        now = datetime.now(timezone.utc)
        doc = {
            "name": name.strip(),
            "email": email.lower().strip(),
            "password_hash": password_hash,
            "role": role.value,
            "is_active": True,
            "status": AccountStatus.ACTIVE.value,
            "created_at": now,
            "updated_at": now,
        }
        result = self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        logger.info("Created user %s (role=%s)", result.inserted_id, role.value)
        return _doc_to_user(doc)


"""
Shared pytest fixtures and configuration.

Tests never touch a real MongoDB. The DB dependency is overridden with an
in-memory MockUserRepository, and the lifespan connection steps are patched out.
"""
from __future__ import annotations

import os

# Force test environment BEFORE any app imports resolve settings.
os.environ["ENVIRONMENT"] = "test"
os.environ["MONGODB_URI"] = "mongodb://localhost:27017"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-chars!!"
os.environ["DATABASE_NAME"] = "mathmax"
os.environ["DATABASE_NAME_TEST"] = "mathmax_test"

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.models.user import AccountStatus, User, UserRole


# ── Reusable domain helpers ──────────────────────────────────────────────────

def make_user(
    id: str = "000000000000000000000001",
    name: str = "Test Teacher",
    email: str = "teacher@test.com",
    role: UserRole = UserRole.TEACHER,
    is_active: bool = True,
) -> User:
    from app.core.security import hash_password
    return User(
        id=id,
        name=name,
        email=email,
        password_hash=hash_password("Password1"),
        role=role,
        is_active=is_active,
        status=AccountStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ── In-memory repository (no MongoDB required) ────────────────────────────────

class MockUserRepository:
    """Fully in-memory UserRepository for unit and integration tests."""

    def __init__(self) -> None:
        self._store: dict[str, User] = {}

    def find_by_email(self, email: str) -> User | None:
        return next(
            (u for u in self._store.values() if u.email == email.lower()), None
        )

    def find_by_id(self, user_id: str) -> User | None:
        return self._store.get(user_id)

    def email_exists(self, email: str) -> bool:
        return self.find_by_email(email) is not None

    def create(self, *, name, email, password_hash, role) -> User:
        uid = f"{len(self._store) + 1:024d}"
        user = User(
            id=uid,
            name=name,
            email=email.lower(),
            password_hash=password_hash,
            role=role,
            is_active=True,
            status=AccountStatus.ACTIVE,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self._store[uid] = user
        return user

    def seed(self, user: User) -> None:
        self._store[user.id] = user


@pytest.fixture
def mock_repo() -> MockUserRepository:
    return MockUserRepository()


# ── TestClient with all DB calls mocked out ───────────────────────────────────

@pytest.fixture
def client(mock_repo: MockUserRepository) -> TestClient:
    """
    FastAPI TestClient.

    - Patches connect_to_mongo / close_mongo_connection so no real DB is needed.
    - Patches ensure_indexes and get_database lifespan calls.
    - Patches ping_database so /health returns 'ok'.
    - Overrides get_user_repo dependency to use MockUserRepository.
    """
    from app.api.dependencies.auth import get_user_repo
    from app.main import app

    app.dependency_overrides[get_user_repo] = lambda: mock_repo

    with (
        patch("app.main.connect_to_mongo"),
        patch("app.main.close_mongo_connection"),
        patch("app.main.ensure_indexes"),
        patch("app.main.get_database"),
        patch("app.api.routes.health.ping_database", return_value=True),
    ):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c

    app.dependency_overrides.clear()

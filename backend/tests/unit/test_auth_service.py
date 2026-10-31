"""
Unit tests — AuthService (business logic, no HTTP, no real DB).
"""
from __future__ import annotations

import pytest

from app.schemas.user import LoginRequest, RegisterRequest
from app.services.auth_service import AuthError, AuthService
from tests.conftest import MockUserRepository, make_user


@pytest.fixture
def repo() -> MockUserRepository:
    return MockUserRepository()


@pytest.fixture
def service(repo: MockUserRepository) -> AuthService:
    return AuthService(repo)


# ── Registration ──────────────────────────────────────────────────────────────

def test_register_success(service: AuthService, repo: MockUserRepository):
    req = RegisterRequest(
        name="Alice Smith",
        email="alice@example.com",
        password="Password1",
        role="student",
    )
    user, token = service.register(req)
    assert user.email == "alice@example.com"
    assert user.name == "Alice Smith"
    assert user.role == "student"
    assert token  # JWT is non-empty
    assert repo.email_exists("alice@example.com")


def test_register_duplicate_email(service: AuthService, repo: MockUserRepository):
    req = RegisterRequest(
        name="Alice",
        email="alice@example.com",
        password="Password1",
        role="student",
    )
    service.register(req)
    with pytest.raises(AuthError) as exc_info:
        service.register(req)
    assert exc_info.value.status_code == 409


def test_register_hashes_password(service: AuthService, repo: MockUserRepository):
    req = RegisterRequest(
        name="Bob",
        email="bob@example.com",
        password="Password1",
        role="teacher",
    )
    user, _ = service.register(req)
    assert user.password_hash != "Password1"
    assert len(user.password_hash) > 20


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_success(service: AuthService, repo: MockUserRepository):
    reg_req = RegisterRequest(
        name="Carol",
        email="carol@example.com",
        password="Password1",
        role="teacher",
    )
    service.register(reg_req)

    login_req = LoginRequest(email="carol@example.com", password="Password1")
    user, token = service.login(login_req)
    assert user.email == "carol@example.com"
    assert token


def test_login_wrong_password(service: AuthService, repo: MockUserRepository):
    reg_req = RegisterRequest(
        name="Dave",
        email="dave@example.com",
        password="Password1",
        role="student",
    )
    service.register(reg_req)

    login_req = LoginRequest(email="dave@example.com", password="WrongPass1")
    with pytest.raises(AuthError) as exc_info:
        service.login(login_req)
    assert exc_info.value.status_code == 401


def test_login_nonexistent_email(service: AuthService):
    req = LoginRequest(email="ghost@example.com", password="Password1")
    with pytest.raises(AuthError) as exc_info:
        service.login(req)
    assert exc_info.value.status_code == 401


def test_login_inactive_account(service: AuthService, repo: MockUserRepository):
    """Inactive users must be refused login."""
    from app.core.security import hash_password
    from app.models.user import AccountStatus, User, UserRole
    from datetime import datetime, timezone

    inactive_user = User(
        id="000000000000000000000099",
        name="Inactive",
        email="inactive@example.com",
        password_hash=hash_password("Password1"),
        role=UserRole.STUDENT,
        is_active=False,
        status=AccountStatus.SUSPENDED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    repo.seed(inactive_user)

    req = LoginRequest(email="inactive@example.com", password="Password1")
    with pytest.raises(AuthError) as exc_info:
        service.login(req)
    assert exc_info.value.status_code == 403


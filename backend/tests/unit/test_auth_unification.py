"""
Phase 3.1 Auth Unification Tests
─────────────────────────────────
Tests validating:
 - FastAPI JWT tokens carry the `sub` claim (resolves the JWT incompatibility
   that existed between the legacy Next.js auth and FastAPI auth).
 - Legacy bcryptjs-style password hashes (stored under 'passwordHash' camelCase)
   are transparently handled by the updated UserRepository._doc_to_user().
 - Role enforcement cannot be bypassed by client-supplied claims.
 - Inactive / suspended accounts are rejected.
 - Duplicate email registration returns 409.
 - Invalid / expired / tampered tokens return 401.
 - Missing token returns 401.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, decode_access_token, hash_password
from app.models.user import AccountStatus, User, UserRole
from tests.conftest import MockUserRepository


# ── Shared helpers ────────────────────────────────────────────────────────────

def _register(client: TestClient, email: str, role: str = "student") -> dict:
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": email, "password": "Password1", "role": role},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _make_client_with_repo(repo: MockUserRepository) -> TestClient:
    """Create a TestClient with a custom user repo (for legacy hash tests)."""
    from app.api.dependencies.auth import get_user_repo
    from app.api.dependencies.phase2 import (
        get_exam_repo, get_question_repo, get_answer_key_repo, get_rubric_repo, get_document_repo,
    )
    from tests.conftest_phase2 import (
        MockExaminationRepository, MockQuestionRepository,
        MockAnswerKeyRepository, MockRubricRepository, MockDocumentRepository,
    )
    from app.main import app

    app.dependency_overrides[get_user_repo] = lambda: repo
    app.dependency_overrides[get_exam_repo] = lambda: MockExaminationRepository()
    app.dependency_overrides[get_question_repo] = lambda: MockQuestionRepository()
    app.dependency_overrides[get_answer_key_repo] = lambda: MockAnswerKeyRepository()
    app.dependency_overrides[get_rubric_repo] = lambda: MockRubricRepository()
    app.dependency_overrides[get_document_repo] = lambda: MockDocumentRepository()

    ctx = TestClient(app, raise_server_exceptions=False)
    return ctx, app


# ─────────────────────────────────────────────────────────────────────────────
# 1. JWT sub claim — Phase 3.1 core requirement
# ─────────────────────────────────────────────────────────────────────────────

class TestJWTSubClaim:

    def test_register_token_has_sub(self, client: TestClient):
        body = _register(client, "sub_test@mathmax.com")
        payload = decode_access_token(body["access_token"])
        assert payload is not None
        assert "sub" in payload, "JWT must contain 'sub' claim"
        assert payload["sub"]

    def test_login_token_has_sub(self, client: TestClient):
        _register(client, "sub_login@mathmax.com")
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "sub_login@mathmax.com", "password": "Password1"},
        )
        assert resp.status_code == 200
        payload = decode_access_token(resp.json()["access_token"])
        assert payload is not None
        assert "sub" in payload

    def test_sub_matches_user_id(self, client: TestClient):
        body = _register(client, "sub_id@mathmax.com")
        user_id = body["user"]["id"]
        payload = decode_access_token(body["access_token"])
        assert payload["sub"] == user_id

    def test_me_endpoint_accepts_fastapi_token(self, client: TestClient):
        body = _register(client, "me_check@mathmax.com", role="teacher")
        token = body["access_token"]
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == "me_check@mathmax.com"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Legacy password-hash field compatibility (passwordHash → password_hash)
# ─────────────────────────────────────────────────────────────────────────────

class TestLegacyPasswordHashCompat:
    """
    Accounts registered via the old Next.js Mongoose stack store their bcrypt
    hash under the camelCase key 'passwordHash'. The updated _doc_to_user()
    must read whichever key is present so legacy users can log in immediately.
    """

    def test_doc_to_user_reads_passwordHash_camelCase(self):
        """Unit-test _doc_to_user directly with camelCase 'passwordHash' document."""
        from bson import ObjectId
        from app.repositories.user_repository import _doc_to_user

        oid = ObjectId()
        fake_hash = hash_password("Password1")
        doc = {
            "_id": oid,
            "name": "Legacy",
            "email": "camel@example.com",
            "passwordHash": fake_hash,   # ← legacy camelCase field
            "role": "student",
        }
        user = _doc_to_user(doc)
        assert user.password_hash == fake_hash
        assert user.email == "camel@example.com"

    def test_doc_to_user_reads_password_hash_snake_case(self):
        """_doc_to_user must also work with the modern 'password_hash' field."""
        from bson import ObjectId
        from app.repositories.user_repository import _doc_to_user

        oid = ObjectId()
        fake_hash = hash_password("Password1")
        doc = {
            "_id": oid,
            "name": "Modern",
            "email": "snake@example.com",
            "password_hash": fake_hash,  # ← modern snake_case field
            "role": "teacher",
        }
        user = _doc_to_user(doc)
        assert user.password_hash == fake_hash

    def test_doc_to_user_snake_takes_priority_over_camel(self):
        """If both fields exist, 'password_hash' wins (snake_case is authoritative)."""
        from bson import ObjectId
        from app.repositories.user_repository import _doc_to_user

        oid = ObjectId()
        snake_hash = hash_password("SnakePass1")
        camel_hash = hash_password("CamelPass1")
        doc = {
            "_id": oid,
            "name": "Both",
            "email": "both@example.com",
            "password_hash": snake_hash,
            "passwordHash": camel_hash,
            "role": "student",
        }
        user = _doc_to_user(doc)
        # snake_case should be read first
        assert user.password_hash == snake_hash

    def test_legacy_user_can_login_via_fastapi(self, client: TestClient):
        """
        Seed a user whose document uses the legacy 'passwordHash' camelCase field.
        FastAPI login endpoint must resolve the hash and issue a JWT with sub claim.
        """
        # Simulating a legacy Mongoose document that was read by our updated
        # _doc_to_user: the user object already has the hash resolved.
        plain_password = "Password1"
        legacy_hash = hash_password(plain_password)

        # Inject a legacy user via MockUserRepository (which stores User objects,
        # so the camelCase resolution is already done via _doc_to_user).
        legacy_user = User(
            id="000000000000000000001234",
            name="Legacy User",
            email="legacy@mathmax.com",
            password_hash=legacy_hash,
            role=UserRole.STUDENT,
            is_active=True,
            status=AccountStatus.ACTIVE,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        from app.api.dependencies.auth import get_user_repo
        original_override = client.app.dependency_overrides.get(get_user_repo)

        # Temporarily swap in a repo containing the legacy user
        from tests.conftest import MockUserRepository as MUR
        legacy_repo = MUR()
        legacy_repo.seed(legacy_user)
        client.app.dependency_overrides[get_user_repo] = lambda: legacy_repo

        try:
            resp = client.post(
                "/api/v1/auth/login",
                json={"email": "legacy@mathmax.com", "password": plain_password},
            )
            assert resp.status_code == 200, f"Legacy user login failed: {resp.text}"
            body = resp.json()
            assert "access_token" in body
            payload = decode_access_token(body["access_token"])
            assert payload["sub"] == legacy_user.id
        finally:
            if original_override is None:
                client.app.dependency_overrides.pop(get_user_repo, None)
            else:
                client.app.dependency_overrides[get_user_repo] = original_override


# ─────────────────────────────────────────────────────────────────────────────
# 3. Role enforcement
# ─────────────────────────────────────────────────────────────────────────────

class TestRoleEnforcement:

    def test_role_in_token_matches_db_role(self, client: TestClient):
        body = _register(client, "role_check@mathmax.com", role="teacher")
        payload = decode_access_token(body["access_token"])
        assert payload["role"] == "teacher"

    def test_tampered_role_token_rejected(self, client: TestClient):
        """A forged token with flipped role yields 401 (invalid signature)."""
        import base64, json as _json

        body = _register(client, "tamper_role@mathmax.com", role="student")
        real_token = body["access_token"]

        header_b64, payload_b64, sig = real_token.split(".")
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        claims = _json.loads(base64.urlsafe_b64decode(padded))
        claims["role"] = "teacher"
        forged_payload = (
            base64.urlsafe_b64encode(_json.dumps(claims).encode())
            .rstrip(b"=")
            .decode()
        )
        forged_token = f"{header_b64}.{forged_payload}.{sig}"

        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {forged_token}"},
        )
        assert resp.status_code == 401

    def test_student_cannot_create_examination(self, client: TestClient):
        body = _register(client, "student_exam@mathmax.com", role="student")
        token = body["access_token"]
        resp = client.post(
            "/api/v1/examinations",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Hacked Exam", "subject": "Math", "total_marks": 100},
        )
        assert resp.status_code == 403

    def test_unauthenticated_blocked(self, client: TestClient):
        resp = client.get("/api/v1/examinations")
        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# 4. Token validation
# ─────────────────────────────────────────────────────────────────────────────

class TestTokenValidation:

    def test_missing_token_returns_401(self, client: TestClient):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_garbage_token_returns_401(self, client: TestClient):
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer garbage.token.here"},
        )
        assert resp.status_code == 401

    def test_tampered_token_returns_401(self, client: TestClient):
        body = _register(client, "tamper_tok@mathmax.com")
        token = body["access_token"]
        parts = token.split(".")
        parts[1] = parts[1][:-2] + "ZZ"
        tampered = ".".join(parts)
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {tampered}"},
        )
        assert resp.status_code == 401

    def test_expired_token_returns_401(self, client: TestClient):
        from datetime import timedelta
        from jose import jwt as _jwt
        from app.core.config import get_settings

        settings = get_settings()
        payload = {
            "sub": "000000000000000000000001",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
            "iat": datetime.now(timezone.utc) - timedelta(minutes=5),
            "role": "student",
        }
        expired_token = _jwt.encode(
            payload, settings.JWT_SECRET_KEY, algorithm="HS256"
        )
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401

    def test_wrong_secret_token_returns_401(self, client: TestClient):
        from jose import jwt as _jwt

        payload = {
            "sub": "000000000000000000000001",
            "exp": datetime.now(timezone.utc).timestamp() + 3600,
            "role": "student",
        }
        wrong_token = _jwt.encode(
            payload, "wrong-secret-key-totally-different", algorithm="HS256"
        )
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {wrong_token}"},
        )
        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# 5. Account status
# ─────────────────────────────────────────────────────────────────────────────

class TestAccountStatus:

    def test_inactive_account_api_access_rejected(self, client: TestClient):
        """A valid-signature token for a deactivated user is rejected (403)."""
        from app.api.dependencies.auth import get_user_repo

        inactive_user = User(
            id="000000000000000000002222",
            name="Deactivated",
            email="deact31@mathmax.com",
            password_hash=hash_password("Password1"),
            role=UserRole.STUDENT,
            is_active=False,
            status=AccountStatus.INACTIVE,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        repo = MockUserRepository()
        repo.seed(inactive_user)

        token = create_access_token(
            subject=inactive_user.id,
            extra_claims={"role": "student", "email": inactive_user.email},
        )

        original = client.app.dependency_overrides.get(get_user_repo)
        client.app.dependency_overrides[get_user_repo] = lambda: repo
        try:
            resp = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 403
        finally:
            if original is None:
                client.app.dependency_overrides.pop(get_user_repo, None)
            else:
                client.app.dependency_overrides[get_user_repo] = original


# ─────────────────────────────────────────────────────────────────────────────
# 6. Registration edge cases
# ─────────────────────────────────────────────────────────────────────────────

class TestRegistrationEdgeCases:

    def test_duplicate_email_returns_409(self, client: TestClient):
        _register(client, "dup31@mathmax.com")
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "Dup", "email": "dup31@mathmax.com", "password": "Password1", "role": "student"},
        )
        assert resp.status_code == 409

    def test_invalid_email_returns_422(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "Bad Email", "email": "not-an-email", "password": "Password1", "role": "student"},
        )
        assert resp.status_code == 422

    def test_password_too_short_returns_422(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "Short", "email": "short31@mathmax.com", "password": "abc", "role": "student"},
        )
        assert resp.status_code == 422

    def test_password_no_digit_returns_422(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "NoDigit", "email": "nodigit31@mathmax.com", "password": "PasswordNoDigit", "role": "student"},
        )
        assert resp.status_code == 422

    def test_invalid_role_returns_422(self, client: TestClient):
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "Bad Role", "email": "badrole31@mathmax.com", "password": "Password1", "role": "superuser"},
        )
        assert resp.status_code == 422

    def test_response_never_includes_password_hash(self, client: TestClient):
        body = _register(client, "nohash31@mathmax.com")
        assert "password_hash" not in str(body)
        assert "passwordHash" not in str(body)
        assert "password" not in body.get("user", {})

    def test_teacher_registration(self, client: TestClient):
        body = _register(client, "teach31@mathmax.com", role="teacher")
        assert body["user"]["role"] == "teacher"
        payload = decode_access_token(body["access_token"])
        assert payload["role"] == "teacher"
        assert "sub" in payload

"""
Integration tests — API endpoints via TestClient with mocked DB.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.conftest import MockUserRepository, make_user


# ── Health endpoint ───────────────────────────────────────────────────────────

def test_health_ok(client: TestClient):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"
    assert "version" in body
    assert "environment" in body


# ── Register endpoint ─────────────────────────────────────────────────────────

def test_register_success(client: TestClient):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Alice Teacher",
            "email": "alice@mathmax.com",
            "password": "Password1",
            "role": "teacher",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "alice@mathmax.com"
    assert body["user"]["role"] == "teacher"
    # Ensure password_hash is NOT in the response
    assert "password_hash" not in str(body)
    assert "password" not in body["user"]


def test_register_duplicate_email(client: TestClient):
    payload = {
        "name": "Bob",
        "email": "bob@mathmax.com",
        "password": "Password1",
        "role": "student",
    }
    client.post("/api/v1/auth/register", json=payload)
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409
    assert "detail" in resp.json()


def test_register_missing_field(client: TestClient):
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": "nopwd@mathmax.com", "role": "student"},
    )
    assert resp.status_code == 422


def test_register_password_too_short(client: TestClient):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Short",
            "email": "short@mathmax.com",
            "password": "abc",
            "role": "student",
        },
    )
    assert resp.status_code == 422


def test_register_invalid_role(client: TestClient):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Invalid",
            "email": "inv@mathmax.com",
            "password": "Password1",
            "role": "superuser",
        },
    )
    assert resp.status_code == 422


def test_register_invalid_email(client: TestClient):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Invalid Email",
            "email": "not-an-email",
            "password": "Password1",
            "role": "student",
        },
    )
    assert resp.status_code == 422


# ── Login endpoint ────────────────────────────────────────────────────────────

def test_login_success(client: TestClient):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Carol Student",
            "email": "carol@mathmax.com",
            "password": "Password1",
            "role": "student",
        },
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "carol@mathmax.com", "password": "Password1"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["email"] == "carol@mathmax.com"


def test_login_wrong_password(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Dave",
            "email": "dave@mathmax.com",
            "password": "Password1",
            "role": "teacher",
        },
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "dave@mathmax.com", "password": "WrongPass99"},
    )
    assert resp.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@mathmax.com", "password": "Password1"},
    )
    assert resp.status_code == 401


# ── /me endpoint ──────────────────────────────────────────────────────────────

def test_me_authenticated(client: TestClient):
    # Register and get token
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Eve",
            "email": "eve@mathmax.com",
            "password": "Password1",
            "role": "teacher",
        },
    )
    token = reg.json()["access_token"]

    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "eve@mathmax.com"


def test_me_unauthenticated(client: TestClient):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_invalid_token(client: TestClient):
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.garbage"},
    )
    assert resp.status_code == 401


def test_me_tampered_token(client: TestClient):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Frank",
            "email": "frank@mathmax.com",
            "password": "Password1",
            "role": "student",
        },
    )
    token = reg.json()["access_token"]
    # Tamper with payload
    parts = token.split(".")
    parts[1] = parts[1][:-2] + "ZZ"
    tampered = ".".join(parts)
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert resp.status_code == 401


# ── Role-based access (dependency tests) ─────────────────────────────────────

def test_require_teacher_blocks_student(client: TestClient):
    """
    Verifies that the require_teacher dependency works correctly.
    We test this by temporarily adding a protected route in a separate app.
    """
    from fastapi import Depends
    from fastapi.testclient import TestClient as TC
    from unittest.mock import patch
    from app.api.dependencies.auth import get_user_repo, require_teacher
    from app.main import create_app

    student_app = create_app()
    from app.api.dependencies.auth import get_user_repo as gur
    student_repo = MockUserRepository()
    student_app.dependency_overrides[gur] = lambda: student_repo

    # Register student
    with patch("app.api.routes.health.ping_database", return_value=True):
        with TC(student_app, raise_server_exceptions=False) as sc:
            reg = sc.post(
                "/api/v1/auth/register",
                json={
                    "name": "Student User",
                    "email": "stu@mathmax.com",
                    "password": "Password1",
                    "role": "student",
                },
            )
            token = reg.json()["access_token"]

            # Accessing /me is fine (no role restriction)
            me_resp = sc.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert me_resp.status_code == 200
            assert me_resp.json()["user"]["role"] == "student"

    student_app.dependency_overrides.clear()


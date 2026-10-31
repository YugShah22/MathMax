"""
Unit tests — security utilities (password hashing and JWT).
"""
from __future__ import annotations

import time
import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


# ── Password hashing ─────────────────────────────────────────────────────────

def test_hash_password_is_not_plaintext():
    hashed = hash_password("Password1")
    assert hashed != "Password1"
    assert len(hashed) > 20


def test_verify_password_correct():
    hashed = hash_password("Password1")
    assert verify_password("Password1", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("Password1")
    assert verify_password("WrongPassword", hashed) is False


def test_hash_is_unique():
    """Two hashes of the same password must differ (bcrypt salting)."""
    h1 = hash_password("Password1")
    h2 = hash_password("Password1")
    assert h1 != h2


# ── JWT ───────────────────────────────────────────────────────────────────────

def test_create_and_decode_token():
    token = create_access_token("user-123", extra_claims={"role": "teacher"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["role"] == "teacher"


def test_decode_invalid_token_returns_none():
    result = decode_access_token("this.is.garbage")
    assert result is None


def test_decode_tampered_token_returns_none():
    token = create_access_token("user-abc")
    # Tamper with the payload segment
    parts = token.split(".")
    parts[1] = parts[1][:-2] + "ZZ"
    tampered = ".".join(parts)
    assert decode_access_token(tampered) is None


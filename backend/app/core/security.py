"""
Security utilities: password hashing and JWT creation/verification.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt as _bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

# ── Password hashing ─────────────────────────────────────────────────────────
# Using bcrypt directly (>=4.0) to avoid passlib incompatibility with bcrypt 5.x.

_BCRYPT_ROUNDS = 12


def hash_password(plain: str) -> str:
    """Return the bcrypt hash of a plaintext password."""
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(subject: str | Any, extra_claims: dict | None = None) -> str:
    """
    Create a signed JWT access token.

    :param subject:     Typically the user's string ID.
    :param extra_claims: Optional additional claims (role, email, …).
    :returns:           Encoded JWT string.
    """
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify a JWT token.

    :returns: The decoded payload dict, or ``None`` if invalid / expired.
    """
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None

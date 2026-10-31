"""
Pydantic schemas for request validation and response serialisation.

Schemas are intentionally separated from the domain model so that:
  - API contracts can evolve independently of domain logic.
  - Sensitive fields (password_hash) are never accidentally serialised.
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import AccountStatus, UserRole


# ── Shared base ──────────────────────────────────────────────────────────────

class _Base(BaseModel):
    model_config = {"str_strip_whitespace": True, "use_enum_values": True}


# ── Auth request schemas ──────────────────────────────────────────────────────

class RegisterRequest(_Base):
    name: Annotated[str, Field(min_length=2, max_length=120, description="Full name")]
    email: EmailStr
    password: Annotated[str, Field(min_length=8, description="Password (min 8 characters)")]
    role: UserRole = UserRole.STUDENT

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


class LoginRequest(_Base):
    email: EmailStr
    password: str


# ── Auth response schemas ─────────────────────────────────────────────────────

class UserResponse(_Base):
    """Safe public representation — never includes password_hash."""
    id: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    status: AccountStatus
    created_at: datetime
    updated_at: datetime


class TokenResponse(_Base):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MeResponse(_Base):
    user: UserResponse


# ── Generic / shared response schemas ────────────────────────────────────────

class ErrorResponse(_Base):
    detail: str


class HealthResponse(_Base):
    status: str
    database: str
    version: str
    environment: str


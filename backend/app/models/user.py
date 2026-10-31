"""
User domain model (in-application representation).

This is the authoritative type used throughout the service layer.
It is NOT a Pydantic model — it is a plain Python dataclass to avoid
coupling the domain to any serialisation framework.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class UserRole(str, Enum):
    TEACHER = "teacher"
    STUDENT = "student"
    ADMIN = "admin"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


@dataclass
class User:
    """Domain representation of a MathMax user."""

    id: str                     # string form of MongoDB _id
    name: str
    email: str
    password_hash: str          # never exposed to clients
    role: UserRole
    is_active: bool = True
    status: AccountStatus = AccountStatus.ACTIVE
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


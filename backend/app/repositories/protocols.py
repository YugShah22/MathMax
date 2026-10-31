"""
Repository protocols — structural interfaces for dependency injection.

Using Protocol (PEP 544) instead of abstract base classes means:
  - The concrete UserRepository needs no explicit inheritance.
  - MockUserRepository in tests satisfies the protocol automatically.
  - Services depend on the interface, not the implementation.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.models.user import User, UserRole


@runtime_checkable
class UserRepositoryProtocol(Protocol):
    """Structural interface that any user repository must satisfy."""

    def find_by_email(self, email: str) -> User | None: ...
    def find_by_id(self, user_id: str) -> User | None: ...
    def email_exists(self, email: str) -> bool: ...
    def create(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        role: UserRole,
    ) -> User: ...


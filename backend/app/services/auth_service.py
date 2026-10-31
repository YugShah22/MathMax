"""
Authentication service — business rules for registration and login.

This module deliberately contains no HTTP or database driver concepts.
It depends only on:
  - UserRepository (injected, for testability)
  - app.core.security (password hashing / JWT)
  - app.schemas.user (validated request data)
"""
from __future__ import annotations

import logging

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories.protocols import UserRepositoryProtocol
from app.schemas.user import LoginRequest, RegisterRequest

logger = logging.getLogger(__name__)


class AuthError(Exception):
    """Raised for expected authentication / authorisation failures."""
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class AuthService:
    """Handles user registration, login, and token issuance."""

    def __init__(self, repo: UserRepositoryProtocol) -> None:
        self._repo = repo

    def register(self, data: RegisterRequest) -> tuple[User, str]:
        """
        Register a new user.

        :raises AuthError: if the email is already taken or any validation
                           rule is violated at the service level.
        :returns: (User, access_token)
        """
        settings = get_settings()

        if self._repo.email_exists(data.email):
            raise AuthError("Email already registered.", status_code=409)

        if len(data.password) < settings.PASSWORD_MIN_LENGTH:
            raise AuthError(
                f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters.",
                status_code=422,
            )

        password_hash = hash_password(data.password)
        user = self._repo.create(
            name=data.name,
            email=data.email,
            password_hash=password_hash,
            role=UserRole(data.role),
        )

        token = create_access_token(
            subject=user.id,
            extra_claims={"email": user.email, "role": user.role, "name": user.name},
        )
        logger.info("User registered: %s (role=%s)", user.email, user.role)
        return user, token

    def login(self, data: LoginRequest) -> tuple[User, str]:
        """
        Authenticate an existing user.

        :raises AuthError: for invalid credentials or inactive account.
        :returns: (User, access_token)
        """
        user = self._repo.find_by_email(data.email)
        if user is None or not verify_password(data.password, user.password_hash):
            # Generic message intentional — do not reveal whether email exists.
            raise AuthError("Invalid email or password.", status_code=401)

        if not user.is_active:
            raise AuthError("Account is disabled. Contact an administrator.", status_code=403)

        token = create_access_token(
            subject=user.id,
            extra_claims={"email": user.email, "role": user.role, "name": user.name},
        )
        logger.info("User logged in: %s", user.email)
        return user, token


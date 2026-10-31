"""
FastAPI dependency injection for authentication and authorisation.

All route handlers that require authentication should declare these
as Depends() parameters rather than parsing tokens themselves.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.db.client import get_database
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_user_repo() -> UserRepository:
    """Dependency: return a UserRepository bound to the active database."""
    return UserRepository(get_database())


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    repo: UserRepository = Depends(get_user_repo),
) -> User:
    """
    Dependency: decode the Bearer token and return the authenticated User.

    Raises HTTP 401 if the token is missing, malformed, or expired.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token — missing subject.",
        )

    user = repo.find_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled.",
        )
    return user


def require_teacher(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: allow only users with role TEACHER."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required.",
        )
    return current_user


def require_student(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: allow only users with role STUDENT."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required.",
        )
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: allow only users with role ADMIN."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


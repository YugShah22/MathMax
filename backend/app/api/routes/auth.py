"""
Authentication routes — registration, login, and current-user introspection.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import get_current_user, get_user_repo
from app.models.user import User
from app.repositories.protocols import UserRepositoryProtocol
from app.schemas.user import (
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthError, AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        status=user.status,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description=(
        "Creates a new teacher, student, or admin account. "
        "Returns a JWT access token on success."
    ),
)
def register(
    body: RegisterRequest,
    repo: UserRepositoryProtocol = Depends(get_user_repo),
) -> TokenResponse:
    service = AuthService(repo)
    try:
        user, token = service.register(body)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive an access token",
    description=(
        "Validates email and password. Returns a JWT access token on success. "
        "The token must be sent as a Bearer token in subsequent requests."
    ),
)
def login(
    body: LoginRequest,
    repo: UserRepositoryProtocol = Depends(get_user_repo),
) -> TokenResponse:
    service = AuthService(repo)
    try:
        user, token = service.login(body)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Get the currently authenticated user",
    description="Returns profile information for the user identified by the Bearer token.",
)
def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(user=_user_to_response(current_user))


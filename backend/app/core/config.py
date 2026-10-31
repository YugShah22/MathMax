"""
Centralized application configuration loaded from environment variables.

All secrets and environment-specific values must be set via a .env file
or real environment variables. No insecure production defaults are used.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings. Every field is validated on startup."""

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "MathMax API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "production", "test"] = "development"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────────────────────────
    MONGODB_URI: str
    DATABASE_NAME: str = "mathmax"
    DATABASE_NAME_TEST: str = "mathmax_test"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # ── Security ─────────────────────────────────────────────────────────────
    PASSWORD_MIN_LENGTH: int = 8

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v

    @field_validator("MONGODB_URI")
    @classmethod
    def mongodb_uri_must_be_set(cls, v: str) -> str:
        if not v or v.strip() == "":
            raise ValueError("MONGODB_URI must be set")
        return v

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT == "test"

    @property
    def active_database_name(self) -> str:
        """Returns the test DB name when running in test mode."""
        return self.DATABASE_NAME_TEST if self.is_test else self.DATABASE_NAME


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton)."""
    return Settings()


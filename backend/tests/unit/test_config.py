"""
Unit tests — configuration validation.
"""
from __future__ import annotations

import os
import importlib
import pytest


def test_settings_load_from_env():
    """Valid environment → Settings loads without error."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.APP_NAME == "MathMax API"
    assert settings.ENVIRONMENT == "test"
    assert settings.DATABASE_NAME_TEST == "mathmax_test"


def test_active_database_is_test():
    """In test environment, active_database_name → test DB."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.active_database_name == settings.DATABASE_NAME_TEST


def test_settings_jwt_secret_too_short(monkeypatch):
    """A JWT_SECRET_KEY shorter than 32 chars must raise ValueError."""
    from app.core.config import Settings
    with pytest.raises(Exception):
        Settings(
            MONGODB_URI="mongodb://localhost:27017",
            JWT_SECRET_KEY="short",
            ENVIRONMENT="test",
        )


def test_settings_missing_mongodb_uri(monkeypatch):
    """Empty MONGODB_URI must raise ValueError."""
    from app.core.config import Settings
    with pytest.raises(Exception):
        Settings(
            MONGODB_URI="",
            JWT_SECRET_KEY="a" * 32,
            ENVIRONMENT="test",
        )


def test_api_v1_prefix():
    from app.core.config import get_settings
    get_settings.cache_clear()
    assert get_settings().API_V1_PREFIX == "/api/v1"


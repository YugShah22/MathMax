"""
Structured application logging configuration.
"""
from __future__ import annotations

import logging
import sys

from app.core.config import get_settings


def setup_logging() -> None:
    """Configure root logger based on the current environment."""
    settings = get_settings()

    level = logging.DEBUG if settings.DEBUG else logging.INFO
    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    date_fmt = "%Y-%m-%dT%H:%M:%S"

    logging.basicConfig(
        level=level,
        format=fmt,
        datefmt=date_fmt,
        stream=sys.stdout,
        force=True,
    )

    # Silence noisy third-party loggers
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    logging.getLogger("passlib").setLevel(logging.WARNING)
    logging.getLogger("jose").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Use ``__name__`` in each module."""
    return logging.getLogger(name)


"""
MongoDB client and lifecycle management.

This module provides:
- A singleton MongoClient.
- startup / shutdown helpers for the FastAPI lifespan.
- A health-check helper.
- A typed DB accessor for other modules to import.
"""
from __future__ import annotations

import logging

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Module-level singletons — set during startup.
_client: MongoClient | None = None
_database: Database | None = None


def connect_to_mongo() -> None:
    """Open the MongoDB connection pool. Call once at application startup."""
    global _client, _database
    settings = get_settings()

    logger.info("Connecting to MongoDB at %s …", settings.MONGODB_URI.split("@")[-1])
    _client = MongoClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5_000,
        connectTimeoutMS=5_000,
        socketTimeoutMS=30_000,
        maxPoolSize=50,
        minPoolSize=5,
    )
    # Force a real connection attempt so startup fails fast if MongoDB is down.
    _client.admin.command("ping")
    _database = _client[settings.active_database_name]
    logger.info("MongoDB connected — database: '%s'", settings.active_database_name)


def close_mongo_connection() -> None:
    """Close the MongoDB connection pool. Call at application shutdown."""
    global _client, _database
    if _client is not None:
        _client.close()
        _client = None
        _database = None
        logger.info("MongoDB connection closed.")


def get_database() -> Database:
    """Return the active database. Raises RuntimeError if not connected."""
    if _database is None:
        raise RuntimeError("Database not initialised — call connect_to_mongo() first.")
    return _database


def ping_database() -> bool:
    """Return True if the database responds to a ping, False otherwise."""
    try:
        if _client is None:
            return False
        _client.admin.command("ping")
        return True
    except (ConnectionFailure, ServerSelectionTimeoutError):
        return False


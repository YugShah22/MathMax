"""
FastAPI application factory and global error handling.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.api.routes import auth, health
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.db.client import close_mongo_connection, connect_to_mongo, get_database
from app.db.indexes import ensure_indexes

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage MongoDB connection for the application lifetime."""
    logger.info("Starting MathMax API …")
    connect_to_mongo()
    ensure_indexes(get_database())
    yield
    close_mongo_connection()
    logger.info("MathMax API shut down.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "MathMax API — AI-powered mathematics examination management platform.\n\n"
            "Authenticate via the **Authorize** button using a Bearer token obtained "
            "from `POST /api/v1/auth/login`."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global exception handlers ─────────────────────────────────────────────

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = [
            {"field": ".".join(str(loc) for loc in e["loc"]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Validation error.", "errors": errors},
        )

    @app.exception_handler(PyMongoError)
    async def mongo_error_handler(
        _request: Request, exc: PyMongoError
    ) -> JSONResponse:
        logger.error("MongoDB error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Database error. Please try again later."},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        _request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected error occurred."},
        )

    # ── Routers ───────────────────────────────────────────────────────────────
    prefix = settings.API_V1_PREFIX
    app.include_router(health.router, prefix=prefix)
    app.include_router(auth.router, prefix=prefix)

    return app


app = create_app()


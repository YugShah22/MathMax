"""
Health check route.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.db.client import ping_database
from app.schemas.user import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application health check",
    description=(
        "Returns the current health status of the API and its MongoDB connection. "
        "Useful for container orchestration readiness probes."
    ),
)
def health_check() -> HealthResponse:
    settings = get_settings()
    db_ok = ping_database()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        database="connected" if db_ok else "unreachable",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


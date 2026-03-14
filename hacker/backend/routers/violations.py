"""routers/violations.py — REST endpoints for centralized violation monitoring."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from ..database import get_db
    from ..violation_engine import violation_engine
except ImportError:
    from database import get_db
    from violation_engine import violation_engine

router = APIRouter(prefix="/api/v1/violations", tags=["Violations"])


@router.get("/summary")
async def get_violation_summary(db: AsyncSession = Depends(get_db)):
    """Return top-level violation analytics for dashboard monitoring."""
    return await violation_engine.get_summary(db)


@router.get("/events")
async def list_violation_events(
    limit: int = Query(default=100, ge=1, le=500),
    actor_role: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Return recent violation events with optional actor-role filtering."""
    return await violation_engine.list_events(
        db,
        limit=limit,
        actor_role=actor_role,
    )

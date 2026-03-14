"""violation_engine.py — centralized persistence and analytics for violation monitoring."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from .models import ViolationEvent
except ImportError:
    from models import ViolationEvent


class ViolationEngine:
    """Stores and summarizes violation telemetry across student and auditor panels."""

    async def record_violation(
        self,
        db: AsyncSession,
        *,
        actor_role: str,
        actor_id: str,
        event_type: str,
        reason: str,
        source: str,
        payload: dict | None = None,
        session_id: uuid.UUID | None = None,
    ) -> ViolationEvent:
        event = ViolationEvent(
            id=uuid.uuid4(),
            actor_role=(actor_role or "unknown").strip() or "unknown",
            actor_id=(actor_id or "unknown").strip() or "unknown",
            session_id=session_id,
            event_type=(event_type or "UNKNOWN").strip() or "UNKNOWN",
            reason=(reason or "unspecified").strip() or "unspecified",
            source=(source or "unknown").strip() or "unknown",
            payload=payload,
            created_at=datetime.now(timezone.utc),
        )
        db.add(event)
        await db.flush()
        return event

    async def get_summary(self, db: AsyncSession) -> dict:
        total_result = await db.execute(select(func.count(ViolationEvent.id)))
        total = int(total_result.scalar_one() or 0)

        last_24h_start = datetime.now(timezone.utc) - timedelta(hours=24)
        last_24h_result = await db.execute(
            select(func.count(ViolationEvent.id)).where(
                ViolationEvent.created_at >= last_24h_start
            )
        )
        last_24h = int(last_24h_result.scalar_one() or 0)

        by_role_rows = await db.execute(
            select(ViolationEvent.actor_role, func.count(ViolationEvent.id))
            .group_by(ViolationEvent.actor_role)
            .order_by(func.count(ViolationEvent.id).desc())
        )
        by_role = {str(role): int(count) for role, count in by_role_rows.all()}

        by_type_rows = await db.execute(
            select(ViolationEvent.event_type, func.count(ViolationEvent.id))
            .group_by(ViolationEvent.event_type)
            .order_by(func.count(ViolationEvent.id).desc())
        )
        by_type = {str(event_type): int(count) for event_type, count in by_type_rows.all()}

        by_source_rows = await db.execute(
            select(ViolationEvent.source, func.count(ViolationEvent.id))
            .group_by(ViolationEvent.source)
            .order_by(func.count(ViolationEvent.id).desc())
        )
        by_source = {str(source): int(count) for source, count in by_source_rows.all()}

        return {
            "total": total,
            "last_24h": last_24h,
            "by_role": by_role,
            "by_type": by_type,
            "by_source": by_source,
        }

    async def list_events(
        self,
        db: AsyncSession,
        *,
        limit: int = 100,
        actor_role: str | None = None,
    ) -> list[dict]:
        normalized_limit = min(max(limit, 1), 500)

        query = select(ViolationEvent).order_by(ViolationEvent.created_at.desc()).limit(
            normalized_limit
        )
        if actor_role:
            query = query.where(ViolationEvent.actor_role == actor_role)

        rows = await db.execute(query)
        events = rows.scalars().all()

        return [
            {
                "id": str(event.id),
                "actor_role": event.actor_role,
                "actor_id": event.actor_id,
                "session_id": str(event.session_id) if event.session_id else None,
                "event_type": event.event_type,
                "reason": event.reason,
                "source": event.source,
                "payload": event.payload,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in events
        ]


violation_engine = ViolationEngine()

"""
routers/ws.py — WebSocket endpoints for real-time exam monitoring.

• /ws/admin/{admin_id}  → auditor dashboards listen here for live events
• /ws/student/{session_id} → student clients push tracking events here

All database operations are fully async (asyncpg) so the event loop stays
responsive even under high connection counts.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ExamSession, TrackingEvent
from ..ws_manager import manager

router = APIRouter()


# ── Admin WebSocket ──────────────────────────────────────────────────────────


@router.websocket("/ws/admin/{admin_id}")
async def admin_ws(websocket: WebSocket, admin_id: str):
    """
    Keeps an admin dashboard connected.
    All student events are broadcast here via ConnectionManager.
    """
    await manager.connect(websocket, role="admin", user_id=admin_id)
    try:
        # Hold the connection open — admins only receive, never send
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(role="admin", user_id=admin_id)


# ── Student WebSocket ────────────────────────────────────────────────────────


@router.websocket("/ws/student/{session_id}")
async def student_ws(websocket: WebSocket, session_id: str):
    """
    Receives tracking events from a student client.

    Flow for each incoming message:
      1. Parse JSON → extract event_type & payload.
      2. Persist a TrackingEvent row (async — never blocks the loop).
      3. If the event is a VIOLATION, decrement the session's trust_score.
      4. Broadcast the enriched event to all connected admins.
    """
    await manager.connect(websocket, role="student", user_id=session_id)

    try:
        while True:
            data = await websocket.receive_json()

            event_type: str = data.get("event_type", "UNKNOWN")
            payload: dict = data.get("payload", {})

            # ── Obtain a fresh async session for each message ──
            async for db in get_db():
                # 1) Persist the tracking event
                tracking_event = TrackingEvent(
                    id=uuid.uuid4(),
                    session_id=uuid.UUID(session_id),
                    event_type=event_type,
                    payload=payload,
                    timestamp=datetime.now(timezone.utc),
                )
                db.add(tracking_event)

                current_trust_score = 100  # fallback

                # 2) If a violation, decrement trust_score
                if event_type == "VIOLATION_DETECTED":
                    result = await db.execute(
                        select(ExamSession).where(
                            ExamSession.id == uuid.UUID(session_id)
                        )
                    )
                    session_obj = result.scalar_one_or_none()
                    if session_obj:
                        session_obj.trust_score = max(
                            0, session_obj.trust_score - 10
                        )
                        current_trust_score = session_obj.trust_score

                await db.commit()

            # 3) Broadcast to every connected admin dashboard
            await manager.broadcast_to_admins(
                {
                    "session_id": session_id,
                    "event_type": event_type,
                    "payload": payload,
                    "trust_score": current_trust_score,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )

    except WebSocketDisconnect:
        manager.disconnect(role="student", user_id=session_id)

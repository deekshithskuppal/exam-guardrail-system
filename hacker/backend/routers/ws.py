"""
routers/ws.py — WebSocket endpoints for real-time exam monitoring.

• /ws/admin/{admin_id}  → auditor dashboards listen here for live events
• /ws/student/{session_id} → student clients push tracking events here

All database operations are fully async (asyncpg) so the event loop stays
responsive even under high connection counts.
"""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from ..database import get_db
    from ..models import ExamResult, ExamSession, TrackingEvent, User
    from ..violation_engine import violation_engine
    from ..ws_manager import manager
except ImportError:
    from database import get_db
    from models import ExamResult, ExamSession, TrackingEvent, User
    from violation_engine import violation_engine
    from ws_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)


def _parse_admin_ids(raw: object) -> list[str]:
    """Normalize admin identifiers from a string/list into a deduplicated list."""
    if raw is None:
        return []

    if isinstance(raw, str):
        parts = [part.strip() for part in raw.split(",")]
        return list(dict.fromkeys([part for part in parts if part]))

    if isinstance(raw, list):
        normalized = []
        for item in raw:
            value = str(item).strip()
            if value:
                normalized.append(value)
        return list(dict.fromkeys(normalized))

    value = str(raw).strip()
    return [value] if value else []


@router.get("/api/v1/sessions/summary")
async def list_session_summaries(db: AsyncSession = Depends(get_db)):
    """Return persisted exam sessions with student and result summary for dashboard preload."""
    try:
        return await _fetch_sessions_summary(db)
    except Exception as exc:
        logger.exception("Failed to fetch session summaries", exc_info=exc)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch session summaries",
        ) from exc


@router.get("/api/v1/sessions/metrics")
async def get_session_metrics(db: AsyncSession = Depends(get_db)):
    """Return strict dashboard metrics from persisted exam/session records."""
    try:
        total_sessions_result = await db.execute(select(func.count(ExamSession.id)))
        total_sessions = _to_int(total_sessions_result.scalar_one(), 0)

        active_exams_result = await db.execute(
            select(func.count(ExamSession.id)).where(ExamSession.status == "active")
        )
        active_exams = _to_int(active_exams_result.scalar_one(), 0)

        total_violations_result = await db.execute(
            select(func.count(TrackingEvent.id)).where(
                TrackingEvent.event_type == "VIOLATION_DETECTED"
            )
        )
        total_violations = _to_int(total_violations_result.scalar_one(), 0)

        total_students_result = await db.execute(
            select(func.count(func.distinct(ExamSession.student_id)))
        )
        total_students_attended = _to_int(total_students_result.scalar_one(), 0)

        return {
            "total_sessions": total_sessions,
            "active_exams": active_exams,
            "total_violations": total_violations,
            "total_students_attended": total_students_attended,
        }
    except Exception as exc:
        logger.exception("Failed to fetch session metrics", exc_info=exc)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch session metrics",
        ) from exc


async def _fetch_sessions_summary(db: AsyncSession) -> list:
    """Inner query helper — raises on any DB error (caller handles it)."""
    violation_counts = (
        select(
            TrackingEvent.session_id.label("session_id"),
            func.count(TrackingEvent.id).label("violations"),
        )
        .where(TrackingEvent.event_type == "VIOLATION_DETECTED")
        .group_by(TrackingEvent.session_id)
        .subquery()
    )

    rows = await db.execute(
        select(
            ExamSession.id,
            ExamSession.status,
            ExamSession.trust_score,
            ExamSession.start_time,
            User.username,
            ExamResult.score,
            ExamResult.total_questions,
            ExamResult.final_percentage,
            ExamResult.violations,
            ExamResult.student_name,
            ExamResult.submitted_at,
            func.coalesce(violation_counts.c.violations, 0),
        )
        .join(User, User.id == ExamSession.student_id)
        .outerjoin(ExamResult, ExamResult.session_id == ExamSession.id)
        .outerjoin(violation_counts, violation_counts.c.session_id == ExamSession.id)
        .order_by(ExamSession.start_time.desc())
    )

    result = []
    for row in rows.all():
        (
            session_id,
            status,
            trust_score,
            start_time,
            username,
            score,
            total_questions,
            final_percentage,
            result_violations,
            result_student_name,
            submitted_at,
            tracked_violations,
        ) = row

        student_external_id = username or "unknown"
        student_name = result_student_name or student_external_id
        violations = _to_int(result_violations, _to_int(tracked_violations, 0))

        result_sheet = None
        if score is not None and total_questions is not None:
            result_sheet = {
                "student_name": student_name,
                "student_id": student_external_id,
                "score": _to_int(score, 0),
                "total_questions": _to_int(total_questions, 0),
                "violations": violations,
                "final_percentage": _to_float(final_percentage, 0.0),
            }

        result.append(
            {
                "id": str(session_id),
                "student": student_name,
                "studentId": student_external_id,
                "startedAt": start_time.isoformat() if start_time else None,
                "submittedAt": submitted_at.isoformat() if submitted_at else None,
                "status": status,
                "trustScore": _to_int(trust_score, 100),
                "violations": violations,
                "score": _to_int(score, 0) if score is not None else None,
                "totalQuestions": _to_int(total_questions, 0)
                if total_questions is not None
                else None,
                "finalPercentage": _to_float(final_percentage, 0.0)
                if final_percentage is not None
                else None,
                "resultSheet": result_sheet,
            }
        )

    return result


def _to_int(value: object, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ── Admin WebSocket ──────────────────────────────────────────────────────────


@router.websocket("/ws/admin/{admin_id}")
async def admin_ws(websocket: WebSocket, admin_id: str):
    """
    Keeps an admin dashboard connected.
    All student events are broadcast here via ConnectionManager.
    """
    await manager.connect(websocket, role="admin", user_id=admin_id)
    try:
        while True:
            data = await websocket.receive_json()
            event_type = str(data.get("event_type", "")).strip()
            payload = data.get("payload") or {}

            if event_type == "ADMIN_VIOLATION_DETECTED":
                reason = str(payload.get("reason") or "Auditor panel violation")
                async for db in get_db():
                    await violation_engine.record_violation(
                        db,
                        actor_role="admin",
                        actor_id=admin_id,
                        event_type=event_type,
                        reason=reason,
                        source=str(payload.get("source") or "auditor_panel"),
                        payload=payload,
                    )
                    await db.commit()
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
    admin_id = websocket.query_params.get("admin_id", "").strip()
    admin_ids_param = websocket.query_params.get("admin_ids", "").strip()
    target_admin_ids = _parse_admin_ids(admin_ids_param)
    if admin_id:
        target_admin_ids = list(dict.fromkeys([admin_id, *target_admin_ids]))

    await manager.connect(websocket, role="student", user_id=session_id)
    if target_admin_ids:
        manager.link_student_to_admins(
            session_id=session_id,
            admin_ids=target_admin_ids,
        )

    try:
        while True:
            data = await websocket.receive_json()

            event_type: str = data.get("event_type", "UNKNOWN")
            payload: dict = data.get("payload", {})
            payload_admin_ids = _parse_admin_ids(payload.get("admin_ids"))
            payload_admin_id = (payload.get("admin_id") or "").strip()
            if payload_admin_id:
                payload_admin_ids = list(dict.fromkeys([payload_admin_id, *payload_admin_ids]))
            effective_admin_ids = list(dict.fromkeys([*target_admin_ids, *payload_admin_ids]))

            if effective_admin_ids:
                manager.link_student_to_admins(
                    session_id=session_id,
                    admin_ids=effective_admin_ids,
                )
            result_sheet: dict | None = None
            session_uuid: uuid.UUID | None = None
            try:
                session_uuid = uuid.UUID(session_id)
            except ValueError:
                session_uuid = None

            # ── Obtain a fresh async session for each message ──
            current_trust_score = 100  # fallback
            if session_uuid is not None:
                async for db in get_db():
                    student_external_id = (payload.get("student_id") or "").strip()
                    if not student_external_id:
                        student_external_id = f"student-{session_id[:8]}"

                    # Ensure the student user row exists so session/event FKs remain valid.
                    user_result = await db.execute(
                        select(User).where(User.username == student_external_id)
                    )
                    student_user = user_result.scalar_one_or_none()
                    if student_user is None:
                        student_user = User(
                            id=uuid.uuid4(),
                            username=student_external_id,
                            role="student",
                        )
                        db.add(student_user)
                        await db.flush()

                    session_result = await db.execute(
                        select(ExamSession).where(ExamSession.id == session_uuid)
                    )
                    session_obj = session_result.scalar_one_or_none()
                    if session_obj is None:
                        session_obj = ExamSession(
                            id=session_uuid,
                            student_id=student_user.id,
                            status="active",
                            trust_score=100,
                        )
                        db.add(session_obj)
                        await db.flush()

                    # 1) Persist the tracking event
                    tracking_event = TrackingEvent(
                        id=uuid.uuid4(),
                        session_id=session_uuid,
                        event_type=event_type,
                        payload=payload,
                        timestamp=datetime.now(timezone.utc),
                    )
                    db.add(tracking_event)

                    # 2) If a violation, decrement trust_score
                    if event_type == "VIOLATION_DETECTED":
                        if session_obj:
                            session_obj.trust_score = max(
                                0, session_obj.trust_score - 10
                            )
                            current_trust_score = session_obj.trust_score

                        await violation_engine.record_violation(
                            db,
                            actor_role="student",
                            actor_id=student_external_id,
                            event_type=event_type,
                            reason=str(payload.get("reason") or "Student panel violation"),
                            source=str(payload.get("source") or "student_panel"),
                            payload=payload,
                            session_id=session_uuid,
                        )
                    elif session_obj:
                        current_trust_score = session_obj.trust_score

                    if event_type == "EXAM_SUBMITTED" and session_obj:
                        session_obj.status = "completed"

                        counted_violations_result = await db.execute(
                            select(func.count(TrackingEvent.id)).where(
                                TrackingEvent.session_id == session_uuid,
                                TrackingEvent.event_type == "VIOLATION_DETECTED",
                            )
                        )
                        counted_violations = _to_int(
                            counted_violations_result.scalar_one(),
                            0,
                        )

                        submitted_sheet = payload.get("result_sheet") or {}
                        score = _to_int(submitted_sheet.get("score"), 0)
                        total_questions = max(
                            1,
                            _to_int(submitted_sheet.get("total_questions"), 1),
                        )
                        submitted_violations = _to_int(
                            submitted_sheet.get("violations"),
                            counted_violations,
                        )
                        violations = max(counted_violations, submitted_violations)

                        submitted_percentage = _to_float(
                            submitted_sheet.get("final_percentage"),
                            -1.0,
                        )
                        final_percentage = (
                            submitted_percentage
                            if submitted_percentage >= 0
                            else round((score / total_questions) * 100, 2)
                        )

                        student_name = (
                            (submitted_sheet.get("student_name") or payload.get("student_name") or "Student")
                            .strip()
                        )
                        student_result = await db.execute(
                            select(ExamResult).where(ExamResult.session_id == session_uuid)
                        )
                        exam_result = student_result.scalar_one_or_none()

                        if exam_result is None:
                            exam_result = ExamResult(
                                id=uuid.uuid4(),
                                session_id=session_uuid,
                                student_name=student_name,
                                student_external_id=student_external_id,
                                score=score,
                                total_questions=total_questions,
                                violations=violations,
                                final_percentage=final_percentage,
                                submitted_at=datetime.now(timezone.utc),
                            )
                            db.add(exam_result)
                        else:
                            exam_result.student_name = student_name
                            exam_result.student_external_id = student_external_id
                            exam_result.score = score
                            exam_result.total_questions = total_questions
                            exam_result.violations = violations
                            exam_result.final_percentage = final_percentage
                            exam_result.submitted_at = datetime.now(timezone.utc)

                        result_sheet = {
                            "student_name": student_name,
                            "student_id": student_external_id,
                            "score": score,
                            "total_questions": total_questions,
                            "violations": violations,
                            "final_percentage": final_percentage,
                        }

                    await db.commit()

            # 3) Broadcast to every connected admin dashboard
            await manager.broadcast_to_linked_admins(
                session_id=session_id,
                message={
                    "session_id": session_id,
                    "event_type": event_type,
                    "payload": payload,
                    "admin_id": effective_admin_ids[0] if effective_admin_ids else None,
                    "admin_ids": effective_admin_ids,
                    "trust_score": current_trust_score,
                    "status": "completed" if event_type == "EXAM_SUBMITTED" else "active",
                    "result_sheet": result_sheet,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

    except WebSocketDisconnect:
        manager.disconnect(role="student", user_id=session_id)

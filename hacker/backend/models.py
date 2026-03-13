"""
models.py — SQLAlchemy async ORM models for SENTINEL.

Every model uses a UUID primary key generated server-side.
Relationships are declared so eager / lazy loading works as expected.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


# ── Helper: generate a new UUID ──
def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class User(Base):
    """Platform user — either an 'admin' (auditor) or a 'student'."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="student"
    )  # 'admin' | 'student'

    # One-to-many: a student can have many exam sessions
    sessions: Mapped[list["ExamSession"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )


class ExamSession(Base):
    """Represents a single exam attempt by a student."""

    __tablename__ = "exam_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # 'active' | 'completed'
    trust_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    student: Mapped["User"] = relationship(back_populates="sessions")
    events: Mapped[list["TrackingEvent"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class TrackingEvent(Base):
    """An event emitted from the student client during an exam."""

    __tablename__ = "tracking_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exam_sessions.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    session: Mapped["ExamSession"] = relationship(back_populates="events")


class ExternalResource(Base):
    """Curated links that students are allowed to access during the exam."""

    __tablename__ = "external_resources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

"""
schemas.py — Pydantic v2 schemas for request / response serialization.

All schemas use `model_config = ConfigDict(from_attributes=True)` so they
can be constructed directly from SQLAlchemy model instances.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ── External Resource ──


class ResourceCreate(BaseModel):
    """Body for POST /api/v1/resources."""

    title: str
    url: str
    is_active: bool = True


class ResourceOut(BaseModel):
    """Response representation of an ExternalResource row."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    url: str
    is_active: bool


# ── Tracking Event ──


class TrackingEventCreate(BaseModel):
    """Schema for incoming WebSocket tracking events from students."""

    event_type: str
    payload: dict | None = None


class TrackingEventOut(BaseModel):
    """Response representation of a TrackingEvent row."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    event_type: str
    payload: dict | None
    timestamp: datetime


# ── Exam Session ──


class ExamSessionOut(BaseModel):
    """Response representation of an ExamSession row."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    status: str
    trust_score: int
    start_time: datetime


# ── Session Summary (for admin dashboard) ──


class SessionSummaryOut(BaseModel):
    """Flattened session row for the auditor dashboard table."""

    id: str
    student: str
    studentId: str
    startedAt: str
    status: str
    trustScore: int
    violations: int

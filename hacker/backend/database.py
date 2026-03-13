"""
database.py — Async SQLAlchemy engine & session factory for PostgreSQL.

Uses `create_async_engine` so every DB call goes through asyncpg,
keeping the FastAPI / WebSocket event loop non-blocking.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.asyncio import DeclarativeBase

# ── Connection string (swap with real credentials / env-var in production) ──
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/dbname"

# ── Engine — pool_pre_ping keeps stale connections from crashing queries ──
engine = create_async_engine(DATABASE_URL, echo=True, pool_pre_ping=True)

# ── Session factory — expire_on_commit=False lets us read attrs after commit ─
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Declarative base for all ORM models ──
class Base(DeclarativeBase):
    pass


# ── FastAPI dependency — yields a scoped async session per request ──
async def get_db() -> AsyncSession:  # type: ignore[misc]
    """
    Async generator that provides a database session to each request.
    The session is automatically closed when the request finishes.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()  # commit on success
        except Exception:
            await session.rollback()  # rollback on error
            raise
        finally:
            await session.close()

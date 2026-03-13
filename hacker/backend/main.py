"""
main.py — FastAPI application entry-point for SENTINEL.

• Registers routers (REST + WebSocket)
• Enables CORS for the Vite dev server (localhost:5173)
• Creates all DB tables on startup via the async lifespan hook
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import resources, ws


# ── Lifespan: create tables on startup, dispose engine on shutdown ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Async lifespan hook — runs once at startup and once at shutdown."""
    # Create tables (safe to call repeatedly; no-ops if tables exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="SENTINEL — Exam Monitoring API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS — allow the React dev server to reach the API ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ──
app.include_router(ws.router)
app.include_router(resources.router)


@app.get("/")
async def root():
    return {"status": "SENTINEL API is running"}

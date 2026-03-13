"""
routers/resources.py — Async CRUD REST API for ExternalResource.

Endpoints:
  GET    /api/v1/resources       → list all resources
  POST   /api/v1/resources       → create a new resource
  DELETE /api/v1/resources/{id}  → soft-delete a resource

All queries use SQLAlchemy's async API so the event loop is never blocked.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ExternalResource
from ..schemas import ResourceCreate, ResourceOut

router = APIRouter(prefix="/api/v1/resources", tags=["Resources"])


@router.get("/", response_model=list[ResourceOut])
async def list_resources(db: AsyncSession = Depends(get_db)):
    """Return every external resource (async query)."""
    result = await db.execute(select(ExternalResource))
    return result.scalars().all()


@router.post("/", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(
    body: ResourceCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new external resource row (async insert + commit)."""
    resource = ExternalResource(
        id=uuid.uuid4(),
        title=body.title,
        url=body.url,
        is_active=body.is_active,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Delete a resource by its UUID (async query + delete)."""
    result = await db.execute(
        select(ExternalResource).where(ExternalResource.id == resource_id)
    )
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )
    await db.delete(resource)
    await db.commit()

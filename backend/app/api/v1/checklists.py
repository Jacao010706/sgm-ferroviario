from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import uuid
from datetime import datetime
from app.core.database import get_db, Base
from sqlalchemy import String, Text, JSON, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from app.models.user import User
from app.api.deps import get_current_user, require_manager

# Model inline para checklist templates
class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"
    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100))
    items: Mapped[list] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

router = APIRouter(prefix="/checklists", tags=["Checklists"])

class ChecklistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    items: list[str] = []

class ChecklistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    items: Optional[list[str]] = None
    is_active: Optional[bool] = None

@router.get("/")
async def list_checklists(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    q = select(ChecklistTemplate).where(ChecklistTemplate.is_active == True)
    if category:
        q = q.where(ChecklistTemplate.category == category)
    q = q.order_by(ChecklistTemplate.name)
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/{checklist_id}")
async def get_checklist(
    checklist_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == checklist_id))
    checklist = result.scalar_one_or_none()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist nao encontrado")
    return checklist

@router.post("/", status_code=201)
async def create_checklist(
    body: ChecklistCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    checklist = ChecklistTemplate(
        name=body.name,
        description=body.description,
        category=body.category,
        items=[{"id": f"item_{i}", "text": item, "done": False} for i, item in enumerate(body.items)]
    )
    db.add(checklist)
    await db.flush()
    await db.refresh(checklist)
    await db.commit()
    return checklist

@router.patch("/{checklist_id}")
async def update_checklist(
    checklist_id: UUID,
    body: ChecklistUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == checklist_id))
    checklist = result.scalar_one_or_none()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist nao encontrado")
    if body.name is not None:
        checklist.name = body.name
    if body.description is not None:
        checklist.description = body.description
    if body.category is not None:
        checklist.category = body.category
    if body.items is not None:
        checklist.items = [{"id": f"item_{i}", "text": item, "done": False} for i, item in enumerate(body.items)]
    if body.is_active is not None:
        checklist.is_active = body.is_active
    await db.commit()
    await db.refresh(checklist)
    return checklist

@router.delete("/{checklist_id}", status_code=204)
async def delete_checklist(
    checklist_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == checklist_id))
    checklist = result.scalar_one_or_none()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist nao encontrado")
    checklist.is_active = False
    await db.commit()

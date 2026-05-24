from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from app.core.database import get_db
from app.models.part import Part
from app.api.deps import get_current_user, require_manager
from app.models.user import User

router = APIRouter(prefix="/parts", tags=["Pecas"])

class PartCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    unit: str = "un"
    quantity_stock: float = 0
    quantity_minimum: float = 0
    unit_cost: Optional[float] = None
    supplier: Optional[str] = None
    category: Optional[str] = None

class PartUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity_stock: Optional[float] = None
    quantity_minimum: Optional[float] = None
    unit_cost: Optional[float] = None
    supplier: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class PartOut(BaseModel):
    id: UUID
    code: str
    name: str
    description: Optional[str]
    unit: str
    quantity_stock: float
    quantity_minimum: float
    unit_cost: Optional[float]
    supplier: Optional[str]
    category: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=list[PartOut])
async def list_parts(search: Optional[str] = Query(None), category: Optional[str] = Query(None), skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    q = select(Part).where(Part.is_active == True)
    if category:
        q = q.where(Part.category == category)
    if search:
        q = q.where(or_(Part.name.ilike(f"%{search}%"), Part.code.ilike(f"%{search}%")))
    q = q.offset(skip).limit(limit).order_by(Part.name)
    result = await db.execute(q)
    return result.scalars().all()

@router.post("/", response_model=PartOut, status_code=201)
async def create_part(body: PartCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    existing = await db.execute(select(Part).where(Part.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Codigo de peca ja existe")
    part = Part(**body.model_dump())
    db.add(part)
    await db.commit()
    await db.refresh(part)
    return part

@router.patch("/{part_id}", response_model=PartOut)
async def update_part(part_id: UUID, body: PartUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    result = await db.execute(select(Part).where(Part.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(404, "Peca nao encontrada")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(part, k, v)
    await db.commit()
    await db.refresh(part)
    return part

@router.delete("/{part_id}", status_code=204)
async def delete_part(part_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    result = await db.execute(select(Part).where(Part.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(404, "Peca nao encontrada")
    part.is_active = False
    await db.commit()


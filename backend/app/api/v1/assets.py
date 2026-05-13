from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.models.asset import Asset, Location, AssetType, AssetStatus
from app.api.deps import get_current_user, require_manager
from app.models.user import User

router = APIRouter(prefix="/assets", tags=["Ativos"])


class AssetCreate(BaseModel):
    tag: str
    name: str
    asset_type: AssetType
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    installation_date: Optional[datetime] = None
    location_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    specifications: Optional[dict] = None
    nominal_voltage_kv: Optional[float] = None
    nominal_power_kva: Optional[float] = None
    nominal_current_a: Optional[float] = None
    criticality: int = 3
    scada_node_id: Optional[str] = None
    modbus_address: Optional[int] = None
    mqtt_topic: Optional[str] = None
    erp_asset_id: Optional[str] = None


class AssetOut(BaseModel):
    id: UUID
    tag: str
    name: str
    asset_type: AssetType
    status: AssetStatus
    manufacturer: Optional[str]
    model: Optional[str]
    serial_number: Optional[str]
    nominal_voltage_kv: Optional[float]
    nominal_power_kva: Optional[float]
    criticality: int
    location_id: Optional[UUID]
    erp_asset_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[AssetOut])
async def list_assets(
    asset_type: Optional[AssetType] = None,
    status: Optional[AssetStatus] = None,
    location_id: Optional[UUID] = None,
    criticality: Optional[int] = None,
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Asset)
    if asset_type:
        q = q.where(Asset.asset_type == asset_type)
    if status:
        q = q.where(Asset.status == status)
    if location_id:
        q = q.where(Asset.location_id == location_id)
    if criticality:
        q = q.where(Asset.criticality == criticality)
    if search:
        q = q.where(Asset.name.ilike(f"%{search}%") | Asset.tag.ilike(f"%{search}%"))
    q = q.offset(skip).limit(limit).order_by(Asset.criticality, Asset.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/summary")
async def assets_summary(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total = await db.execute(select(func.count(Asset.id)))
    by_status = await db.execute(
        select(Asset.status, func.count(Asset.id)).group_by(Asset.status)
    )
    by_type = await db.execute(
        select(Asset.asset_type, func.count(Asset.id)).group_by(Asset.asset_type)
    )
    return {
        "total": total.scalar(),
        "by_status": {row[0]: row[1] for row in by_status},
        "by_type": {row[0]: row[1] for row in by_type},
    }


@router.get("/{asset_id}", response_model=AssetOut)
async def get_asset(asset_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    return asset


@router.post("/", response_model=AssetOut, status_code=201)
async def create_asset(
    body: AssetCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    existing = await db.execute(select(Asset).where(Asset.tag == body.tag))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Tag '{body.tag}' já existe")
    asset = Asset(**body.model_dump())
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return asset


@router.patch("/{asset_id}/status")
async def update_asset_status(
    asset_id: UUID,
    status: AssetStatus,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    asset.status = status
    return {"id": str(asset_id), "status": status}


# ─── Localidades ────────────────────────────────────────────────────────────

locations_router = APIRouter(prefix="/locations", tags=["Localidades"])


class LocationCreate(BaseModel):
    name: str
    code: str
    line: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    parent_id: Optional[UUID] = None


@locations_router.get("/")
async def list_locations(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Location).order_by(Location.name))
    return result.scalars().all()


@locations_router.post("/", status_code=201)
async def create_location(
    body: LocationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    location = Location(**body.model_dump())
    db.add(location)
    await db.flush()
    await db.refresh(location)
    return location

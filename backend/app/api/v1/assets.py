from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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
    warranty_expiry: Optional[datetime] = None
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
    qr_code: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    installation_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    location_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    description: Optional[str] = None
    specifications: Optional[dict] = None
    nominal_voltage_kv: Optional[float] = None
    nominal_power_kva: Optional[float] = None
    nominal_current_a: Optional[float] = None
    criticality: Optional[int] = None
    erp_asset_id: Optional[str] = None
    qr_code: Optional[str] = None

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
    nominal_current_a: Optional[float]
    criticality: int
    location_id: Optional[UUID]
    parent_id: Optional[UUID]
    description: Optional[str]
    installation_date: Optional[datetime]
    warranty_expiry: Optional[datetime]
    erp_asset_id: Optional[str]
    qr_code: Optional[str]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

@router.get("/", response_model=list[AssetOut])
async def list_assets(asset_type: Optional[AssetType]=None, status: Optional[AssetStatus]=None, location_id: Optional[UUID]=None, criticality: Optional[int]=None, search: Optional[str]=Query(None), skip: int=0, limit: int=50, db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    q = select(Asset)
    if asset_type: q = q.where(Asset.asset_type == asset_type)
    if status: q = q.where(Asset.status == status)
    if location_id: q = q.where(Asset.location_id == location_id)
    if criticality: q = q.where(Asset.criticality == criticality)
    if search: q = q.where(Asset.name.ilike(f"%{search}%") | Asset.tag.ilike(f"%{search}%"))
    q = q.offset(skip).limit(limit).order_by(Asset.criticality, Asset.name)
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/summary")
async def assets_summary(db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    total = await db.execute(select(func.count(Asset.id)))
    by_status = await db.execute(select(Asset.status, func.count(Asset.id)).group_by(Asset.status))
    by_type = await db.execute(select(Asset.asset_type, func.count(Asset.id)).group_by(Asset.asset_type))
    by_criticality = await db.execute(select(Asset.criticality, func.count(Asset.id)).group_by(Asset.criticality).order_by(Asset.criticality))
    return {"total": total.scalar(), "by_status": {r[0]: r[1] for r in by_status}, "by_type": {r[0]: r[1] for r in by_type}, "by_criticality": {r[0]: r[1] for r in by_criticality}}

@router.get("/{asset_id}", response_model=AssetOut)
async def get_asset(asset_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset: raise HTTPException(status_code=404, detail="Ativo nao encontrado")
    return asset

@router.post("/", response_model=AssetOut, status_code=201)
async def create_asset(body: AssetCreate, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    existing = await db.execute(select(Asset).where(Asset.tag == body.tag))
    if existing.scalar_one_or_none(): raise HTTPException(status_code=400, detail="Tag ja existe")
    asset = Asset(**body.model_dump())
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return asset

@router.patch("/{asset_id}", response_model=AssetOut)
async def update_asset(asset_id: UUID, body: AssetUpdate, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset: raise HTTPException(status_code=404, detail="Ativo nao encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)
    await db.commit()
    await db.refresh(asset)
    return asset

@router.patch("/{asset_id}/status")
async def update_asset_status(asset_id: UUID, status: AssetStatus, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset: raise HTTPException(status_code=404, detail="Ativo nao encontrado")
    asset.status = status
    await db.commit()
    return {"id": str(asset_id), "status": status}

@router.delete("/{asset_id}", status_code=204)
async def deactivate_asset(asset_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset: raise HTTPException(status_code=404, detail="Ativo nao encontrado")
    asset.status = AssetStatus.DECOMMISSIONED
    await db.commit()

@router.options("/{asset_id}/permanent", status_code=200)
async def options_delete_asset_permanent():
    return {}

@router.delete("/{asset_id}/permanent", status_code=204)
async def delete_asset_permanent(asset_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset: raise HTTPException(status_code=404, detail="Ativo nao encontrado")
    if asset.status != AssetStatus.DECOMMISSIONED:
        raise HTTPException(status_code=400, detail="Apenas ativos desativados podem ser excluidos permanentemente")
    from app.models.maintenance import WorkOrder, MaintenancePlan
    from app.models.alert import Alert
    from app.models.iot import IoTReading, SensorConfig
    async def delete_asset_data(aid):
        for wo in (await db.execute(select(WorkOrder).where((WorkOrder.asset_id == aid) | (WorkOrder.sub_asset_id == aid)))).scalars().all():
            await db.delete(wo)
        for mp in (await db.execute(select(MaintenancePlan).where(MaintenancePlan.asset_id == aid))).scalars().all():
            await db.delete(mp)
        for al in (await db.execute(select(Alert).where(Alert.asset_id == aid))).scalars().all():
            await db.delete(al)
        for ir in (await db.execute(select(IoTReading).where(IoTReading.asset_id == aid))).scalars().all():
            await db.delete(ir)
        for sc in (await db.execute(select(SensorConfig).where(SensorConfig.asset_id == aid))).scalars().all():
            await db.delete(sc)
    await delete_asset_data(asset_id)
    for sub in (await db.execute(select(Asset).where(Asset.parent_id == asset_id))).scalars().all():
        await delete_asset_data(sub.id)
        await db.delete(sub)
    await db.delete(asset)
    await db.commit()

locations_router = APIRouter(prefix="/locations", tags=["Localidades"])

class LocationCreate(BaseModel):
    name: str
    code: str
    line: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    parent_id: Optional[UUID] = None

class LocationOut(BaseModel):
    id: UUID
    name: str
    code: str
    line: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    parent_id: Optional[UUID]
    class Config:
        from_attributes = True

@locations_router.get("/", response_model=list[LocationOut])
async def list_locations(db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    result = await db.execute(select(Location).order_by(Location.name))
    return result.scalars().all()

@locations_router.get("/{location_id}", response_model=LocationOut)
async def get_location(location_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location: raise HTTPException(status_code=404, detail="Localidade nao encontrada")
    return location

@locations_router.post("/", status_code=201, response_model=LocationOut)
async def create_location(body: LocationCreate, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    existing = await db.execute(select(Location).where(Location.code == body.code))
    if existing.scalar_one_or_none(): raise HTTPException(status_code=400, detail="Codigo ja existe")
    location = Location(**body.model_dump())
    db.add(location)
    await db.flush()
    await db.refresh(location)
    return location

@locations_router.delete("/{location_id}", status_code=204)
async def delete_location(location_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location: raise HTTPException(status_code=404, detail="Localidade nao encontrada")
    await db.delete(location)
    await db.commit()

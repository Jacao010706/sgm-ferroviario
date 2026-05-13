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
    scada_node_id: Optional[str] = None
    modbus_address: Optional[int] = None
    mqtt_topic: Optional[str] = None
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
async def list_assets(
    asset_type: Optional[AssetType] = None,
    status
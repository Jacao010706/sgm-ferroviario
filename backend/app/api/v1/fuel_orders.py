from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.models.fuel_order import FuelOrder, FuelOrderItem
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/fuel-orders", tags=["OS Combustivel"])


class FuelOrderItemCreate(BaseModel):
    subitem: Optional[str] = None
    station: str
    forecast_liters: Optional[float] = None
    supplied_liters: Optional[float] = None
    ggd_automatic: Optional[str] = None


class FuelOrderCreate(BaseModel):
    number: str
    execution_date: datetime
    location: Optional[str] = None
    sector: Optional[str] = None
    shift: Optional[str] = None
    week: Optional[str] = None
    supplier: Optional[str] = None
    fiscal_1: Optional[str] = None
    fiscal_2: Optional[str] = None
    additive_station: Optional[str] = None
    additive_forecast_ml: Optional[float] = None
    additive_quantity_ml: Optional[float] = None
    additive_completed: Optional[str] = None
    observations: Optional[str] = None
    management_observations: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_re: Optional[str] = None
    employee_1_name: Optional[str] = None
    employee_1_re: Optional[str] = None
    employee_2_name: Optional[str] = None
    employee_2_re: Optional[str] = None
    items: List[FuelOrderItemCreate] = []


def _serialize(order: FuelOrder) -> dict:
    return {
        "id": str(order.id),
        "number": order.number,
        "execution_date": order.execution_date.isoformat(),
        "location": order.location,
        "sector": order.sector,
        "shift": order.shift,
        "week": order.week,
        "supplier": order.supplier,
        "fiscal_1": order.fiscal_1,
        "fiscal_2": order.fiscal_2,
        "additive_station": order.additive_station,
        "additive_forecast_ml": order.additive_forecast_ml,
        "additive_quantity_ml": order.additive_quantity_ml,
        "additive_completed": order.additive_completed,
        "observations": order.observations,
        "management_observations": order.management_observations,
        "responsible_name": order.responsible_name,
        "responsible_re": order.responsible_re,
        "employee_1_name": order.employee_1_name,
        "employee_1_re": order.employee_1_re,
        "employee_2_name": order.employee_2_name,
        "employee_2_re": order.employee_2_re,
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "id": str(i.id),
                "subitem": i.subitem,
                "station": i.station,
                "forecast_liters": i.forecast_liters,
                "supplied_liters": i.supplied_liters,
                "ggd_automatic": i.ggd_automatic,
            }
            for i in (order.items or [])
        ],
        "total_supplied": sum((i.supplied_liters or 0) for i in (order.items or [])),
    }


@router.get("/")
async def list_fuel_orders(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    q = select(FuelOrder).options(selectinload(FuelOrder.items)).order_by(FuelOrder.execution_date.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    orders = result.scalars().all()
    return [_serialize(o) for o in orders]


@router.get("/next-number")
async def next_number(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(func.count(FuelOrder.id)))
    count = result.scalar() or 0
    return {"number": f"{count + 1:04d}"}


@router.get("/{order_id}")
async def get_fuel_order(order_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(FuelOrder).options(selectinload(FuelOrder.items)).where(FuelOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="OS nao encontrada")
    return _serialize(order)



class FuelOrderUpdate(BaseModel):
    number: Optional[str] = None
    execution_date: Optional[datetime] = None
    location: Optional[str] = None
    sector: Optional[str] = None
    shift: Optional[str] = None
    week: Optional[str] = None
    supplier: Optional[str] = None
    fiscal_1: Optional[str] = None
    fiscal_2: Optional[str] = None
    additive_station: Optional[str] = None
    additive_forecast_ml: Optional[float] = None
    additive_quantity_ml: Optional[float] = None
    additive_completed: Optional[str] = None
    observations: Optional[str] = None
    management_observations: Optional[str] = None
    responsible_name: Optional[str] = None
    responsible_re: Optional[str] = None
    employee_1_name: Optional[str] = None
    employee_1_re: Optional[str] = None
    employee_2_name: Optional[str] = None
    employee_2_re: Optional[str] = None
    items: Optional[List[FuelOrderItemCreate]] = None
@router.post("/", status_code=201)
async def create_fuel_order(
    body: FuelOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(FuelOrder).where(FuelOrder.number == body.number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"OS {body.number} ja existe")

    data = body.model_dump(exclude={"items"})
    if data.get("execution_date") and hasattr(data["execution_date"], "tzinfo") and data["execution_date"].tzinfo is not None:
        data["execution_date"] = data["execution_date"].replace(tzinfo=None)
    order = FuelOrder(**data, created_by_id=current_user.id)
    db.add(order)
    await db.flush()

    for item_data in body.items:
        item = FuelOrderItem(**item_data.model_dump(), fuel_order_id=order.id)
        db.add(item)

    await db.commit()
    await db.refresh(order)

    from sqlalchemy.orm import selectinload
    result = await db.execute(select(FuelOrder).options(selectinload(FuelOrder.items)).where(FuelOrder.id == order.id))
    order = result.scalar_one()
    return _serialize(order)



@router.patch("/{order_id}")
async def update_fuel_order(
    order_id: UUID,
    body: FuelOrderUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(FuelOrder).options(selectinload(FuelOrder.items)).where(FuelOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="OS de abastecimento nao encontrada")

    data = body.model_dump(exclude={"items"}, exclude_unset=True)
    if data.get("execution_date") and hasattr(data["execution_date"], "tzinfo") and data["execution_date"].tzinfo is not None:
        data["execution_date"] = data["execution_date"].replace(tzinfo=None)
    for key, value in data.items():
        setattr(order, key, value)

    if body.items is not None:
        for item in list(order.items):
            await db.delete(item)
        await db.flush()
        for item_data in body.items:
            item = FuelOrderItem(**item_data.model_dump(), fuel_order_id=order.id)
            db.add(item)

    await db.commit()
    result = await db.execute(select(FuelOrder).options(selectinload(FuelOrder.items)).where(FuelOrder.id == order_id))
    order = result.scalar_one()
    return _serialize(order)
@router.delete("/{order_id}", status_code=204)
async def delete_fuel_order(order_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(FuelOrder).where(FuelOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="OS nao encontrada")
    await db.delete(order)
    await db.commit()

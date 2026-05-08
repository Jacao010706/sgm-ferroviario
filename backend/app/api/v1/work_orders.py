from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
import uuid as uuid_module
from app.core.database import get_db
from app.models.maintenance import WorkOrder, WorkOrderStatus, MaintenanceType, Priority
from app.models.user import User
from app.api.deps import get_current_user, require_manager, require_technician

router = APIRouter(prefix="/work-orders", tags=["Ordens de Serviço"])


class WorkOrderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    asset_id: UUID
    maintenance_type: MaintenanceType
    priority: Priority = Priority.MEDIUM
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    estimated_duration_h: Optional[float] = None
    assigned_to_id: Optional[UUID] = None
    maintenance_plan_id: Optional[UUID] = None


class WorkOrderUpdate(BaseModel):
    status: Optional[WorkOrderStatus] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    actual_duration_h: Optional[float] = None
    observations: Optional[str] = None
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    checklist_progress: Optional[dict] = None
    parts_used: Optional[list] = None


def generate_os_number() -> str:
    from datetime import date
    year = date.today().year
    seq = str(uuid_module.uuid4().int)[:5]
    return f"OS-{year}-{seq}"


@router.get("/")
async def list_work_orders(
    status: Optional[WorkOrderStatus] = None,
    priority: Optional[Priority] = None,
    asset_id: Optional[UUID] = None,
    assigned_to_id: Optional[UUID] = None,
    maintenance_type: Optional[MaintenanceType] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(WorkOrder)
    if status:
        q = q.where(WorkOrder.status == status)
    if priority:
        q = q.where(WorkOrder.priority == priority)
    if asset_id:
        q = q.where(WorkOrder.asset_id == asset_id)
    if assigned_to_id:
        q = q.where(WorkOrder.assigned_to_id == assigned_to_id)
    if maintenance_type:
        q = q.where(WorkOrder.maintenance_type == maintenance_type)
    if from_date:
        q = q.where(WorkOrder.created_at >= from_date)
    if to_date:
        q = q.where(WorkOrder.created_at <= to_date)
    q = q.offset(skip).limit(limit).order_by(WorkOrder.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/my-orders")
async def my_work_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """OS atribuídas ao técnico logado — usada pelo app mobile"""
    result = await db.execute(
        select(WorkOrder)
        .where(
            WorkOrder.assigned_to_id == current_user.id,
            WorkOrder.status.not_in([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED]),
        )
        .order_by(WorkOrder.priority, WorkOrder.scheduled_start)
    )
    return result.scalars().all()


@router.get("/kpis")
async def work_order_kpis(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total = (await db.execute(select(func.count(WorkOrder.id)))).scalar()
    open_orders = (await db.execute(
        select(func.count(WorkOrder.id)).where(
            WorkOrder.status.not_in([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])
        )
    )).scalar()
    overdue = (await db.execute(
        select(func.count(WorkOrder.id)).where(
            and_(
                WorkOrder.scheduled_end < datetime.utcnow(),
                WorkOrder.status.not_in([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED]),
            )
        )
    )).scalar()
    avg_duration = (await db.execute(
        select(func.avg(WorkOrder.actual_duration_h)).where(
            WorkOrder.status == WorkOrderStatus.COMPLETED
        )
    )).scalar()
    return {
        "total": total,
        "open": open_orders,
        "overdue": overdue,
        "avg_duration_hours": round(avg_duration or 0, 2),
    }


@router.post("/", status_code=201)
async def create_work_order(
    body: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    wo = WorkOrder(
        **body.model_dump(),
        number=generate_os_number(),
        created_by_id=current_user.id,
    )
    db.add(wo)
    await db.flush()
    await db.refresh(wo)
    return wo


@router.get("/{wo_id}")
async def get_work_order(wo_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    return wo


@router.patch("/{wo_id}")
async def update_work_order(
    wo_id: UUID,
    body: WorkOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="OS não encontrada")

    update_data = body.model_dump(exclude_none=True)

    if body.status == WorkOrderStatus.IN_PROGRESS and not wo.actual_start:
        update_data["actual_start"] = datetime.utcnow()

    if body.status == WorkOrderStatus.COMPLETED and wo.actual_start:
        update_data["actual_end"] = datetime.utcnow()
        delta = (datetime.utcnow() - wo.actual_start).total_seconds() / 3600
        update_data["actual_duration_h"] = round(delta, 2)

    for k, v in update_data.items():
        setattr(wo, k, v)

    return wo


@router.post("/{wo_id}/sync-erp")
async def sync_to_erp(
    wo_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    """Dispara sincronização manual com o ERP"""
    from app.services.erp_sync_service import sync_work_order_to_erp
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    synced = await sync_work_order_to_erp(wo)
    return {"synced": synced, "erp_wo_id": wo.erp_wo_id}

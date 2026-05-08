from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.maintenance import MaintenancePlan, MaintenanceType, Frequency, Priority
from app.models.user import User
from app.api.deps import get_current_user, require_manager

router = APIRouter(prefix="/maintenance-plans", tags=["Planos de Manutenção"])


class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    asset_id: UUID
    maintenance_type: MaintenanceType
    frequency: Frequency
    frequency_days: Optional[int] = None
    estimated_duration_h: float = 1.0
    priority: Priority = Priority.MEDIUM
    checklist: Optional[list] = None
    required_skills: Optional[list] = None
    required_parts: Optional[list] = None


FREQUENCY_DAYS = {
    Frequency.DAILY: 1,
    Frequency.WEEKLY: 7,
    Frequency.BIWEEKLY: 14,
    Frequency.MONTHLY: 30,
    Frequency.QUARTERLY: 90,
    Frequency.SEMIANNUAL: 180,
    Frequency.ANNUAL: 365,
    Frequency.BIENNIAL: 730,
}


@router.get("/")
async def list_plans(
    asset_id: Optional[UUID] = None,
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(MaintenancePlan)
    if asset_id:
        q = q.where(MaintenancePlan.asset_id == asset_id)
    if is_active is not None:
        q = q.where(MaintenancePlan.is_active == is_active)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/due-soon")
async def plans_due_soon(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Planos com manutenção vencendo nos próximos N dias"""
    cutoff = datetime.utcnow() + timedelta(days=days)
    result = await db.execute(
        select(MaintenancePlan).where(
            MaintenancePlan.is_active == True,
            MaintenancePlan.next_due <= cutoff,
        ).order_by(MaintenancePlan.next_due)
    )
    return result.scalars().all()


@router.post("/", status_code=201)
async def create_plan(
    body: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    days = body.frequency_days if body.frequency == Frequency.CUSTOM_DAYS else FREQUENCY_DAYS.get(body.frequency, 30)
    next_due = datetime.utcnow() + timedelta(days=days)
    plan = MaintenancePlan(
        **body.model_dump(),
        next_due=next_due,
        created_by_id=current_user.id,
    )
    db.add(plan)
    await db.flush()
    await db.refresh(plan)
    return plan


@router.post("/{plan_id}/generate-work-order")
async def generate_work_order(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Gera uma OS a partir do plano de manutenção"""
    from app.models.maintenance import WorkOrder
    from app.api.v1.work_orders import generate_os_number

    result = await db.execute(select(MaintenancePlan).where(MaintenancePlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    wo = WorkOrder(
        number=generate_os_number(),
        title=f"[PM] {plan.name}",
        description=plan.description,
        asset_id=plan.asset_id,
        maintenance_type=plan.maintenance_type,
        priority=plan.priority,
        maintenance_plan_id=plan.id,
        estimated_duration_h=plan.estimated_duration_h,
        checklist_progress={item["id"]: False for item in (plan.checklist or [])},
        created_by_id=current_user.id,
        scheduled_start=datetime.utcnow(),
    )
    db.add(wo)
    days = FREQUENCY_DAYS.get(plan.frequency, plan.frequency_days or 30)
    plan.last_executed = datetime.utcnow()
    plan.next_due = datetime.utcnow() + timedelta(days=days)
    await db.flush()
    return {"work_order_id": str(wo.id), "number": wo.number, "next_due": plan.next_due.isoformat()}

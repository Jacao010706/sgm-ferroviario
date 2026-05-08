from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus, AlertSource
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alertas"])


@router.get("/")
async def list_alerts(
    severity: Optional[AlertSeverity] = None,
    status: Optional[AlertStatus] = None,
    asset_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Alert)
    if severity:
        q = q.where(Alert.severity == severity)
    if status:
        q = q.where(Alert.status == status)
    if asset_id:
        q = q.where(Alert.asset_id == asset_id)
    q = q.offset(skip).limit(limit).order_by(Alert.triggered_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/active-count")
async def active_alerts_count(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(
        select(Alert.severity, func.count(Alert.id))
        .where(Alert.status == AlertStatus.ACTIVE)
        .group_by(Alert.severity)
    )
    return {row[0]: row[1] for row in result}


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by_id = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    return {"status": "acknowledged"}


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.utcnow()
    return {"status": "resolved"}


@router.post("/{alert_id}/create-work-order")
async def create_wo_from_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Abre OS automaticamente a partir de um alerta"""
    from app.models.maintenance import WorkOrder, MaintenanceType, Priority
    from app.api.v1.work_orders import generate_os_number

    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")

    priority_map = {
        AlertSeverity.CRITICAL: Priority.CRITICAL,
        AlertSeverity.HIGH: Priority.HIGH,
        AlertSeverity.MEDIUM: Priority.MEDIUM,
        AlertSeverity.LOW: Priority.LOW,
    }

    wo = WorkOrder(
        number=generate_os_number(),
        title=f"[ALERTA] {alert.title}",
        description=f"OS gerada automaticamente a partir do alerta: {alert.description}",
        asset_id=alert.asset_id,
        maintenance_type=MaintenanceType.CORRECTIVE,
        priority=priority_map.get(alert.severity, Priority.MEDIUM),
        alert_id=alert.id,
        created_by_id=current_user.id,
    )
    db.add(wo)
    alert.status = AlertStatus.IN_TREATMENT
    await db.flush()
    return {"work_order_id": str(wo.id), "number": wo.number}

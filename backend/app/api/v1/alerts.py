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
from app.api.deps import get_current_user, require_manager

router = APIRouter(prefix="/alerts", tags=["Alertas"])

class AlertCreate(BaseModel):
    title: str
    description: Optional[str] = None
    asset_id: UUID
    severity: AlertSeverity
    source: AlertSource = AlertSource.MANUAL
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold_value: Optional[float] = None

@router.get("/")
async def list_alerts(severity: Optional[AlertSeverity]=None, status: Optional[AlertStatus]=None, asset_id: Optional[UUID]=None, source: Optional[AlertSource]=None, from_date: Optional[datetime]=None, to_date: Optional[datetime]=None, skip: int=0, limit: int=100, db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    q = select(Alert)
    if severity: q = q.where(Alert.severity == severity)
    if status: q = q.where(Alert.status == status)
    if asset_id: q = q.where(Alert.asset_id == asset_id)
    if source: q = q.where(Alert.source == source)
    if from_date: q = q.where(Alert.triggered_at >= from_date)
    if to_date: q = q.where(Alert.triggered_at <= to_date)
    q = q.offset(skip).limit(limit).order_by(Alert.triggered_at.desc())
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/active-count")
async def active_alerts_count(db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    result = await db.execute(select(Alert.severity, func.count(Alert.id)).where(Alert.status == AlertStatus.ACTIVE).group_by(Alert.severity))
    total = await db.execute(select(func.count(Alert.id)).where(Alert.status == AlertStatus.ACTIVE))
    return {"total": total.scalar(), "by_severity": {row[0]: row[1] for row in result}}

@router.get("/{alert_id}")
async def get_alert(alert_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert: raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    return alert

@router.post("/", status_code=201)
async def create_alert(body: AlertCreate, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    alert = Alert(**body.model_dump(), triggered_at=datetime.utcnow())
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    await db.commit()
    return alert

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: UUID, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert: raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    if alert.status != AlertStatus.ACTIVE: raise HTTPException(status_code=400, detail="Alerta nao esta ativo")
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by_id = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    await db.commit()
    return {"status": "acknowledged", "acknowledged_at": alert.acknowledged_at}

@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: UUID, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert: raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    return {"status": "resolved", "resolved_at": alert.resolved_at}

@router.post("/{alert_id}/create-work-order")
async def create_wo_from_alert(alert_id: UUID, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    from app.models.maintenance import WorkOrder, MaintenanceType, Priority
    from app.api.v1.work_orders import generate_os_number
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert: raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    priority_map = {AlertSeverity.CRITICAL: Priority.CRITICAL, AlertSeverity.HIGH: Priority.HIGH, AlertSeverity.MEDIUM: Priority.MEDIUM, AlertSeverity.LOW: Priority.LOW}
    wo = WorkOrder(number=generate_os_number(), title=f"[ALERTA] {alert.title}", description=f"OS gerada automaticamente a partir do alerta: {alert.description}", asset_id=alert.asset_id, maintenance_type=MaintenanceType.CORRECTIVE, priority=priority_map.get(alert.severity, Priority.MEDIUM), alert_id=alert.id, created_by_id=current_user.id)
    db.add(wo)
    alert.status = AlertStatus.IN_TREATMENT
    await db.flush()
    await db.commit()
    return {"work_order_id": str(wo.id), "number": wo.number}

@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert: raise HTTPException(status_code=404, detail="Alerta nao encontrado")
    await db.delete(alert)
    await db.commit()

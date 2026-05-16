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
from fastapi import UploadFile, File
import cloudinary
import cloudinary.uploader
import os

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)
router = APIRouter(prefix="/work-orders", tags=["Ordens de Servico"])

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
    team_id: Optional[UUID] = None
    contractor_name: Optional[str] = None
    contractor_document: Optional[str] = None
    internal_hours: Optional[float] = None
    contractor_hours: Optional[float] = None

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
    assigned_to_id: Optional[UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    priority: Optional[Priority] = None
    team_id: Optional[UUID] = None
    contractor_name: Optional[str] = None
    contractor_document: Optional[str] = None
    internal_hours: Optional[float] = None
    contractor_hours: Optional[float] = None

def generate_os_number() -> str:
    from datetime import date
    year = date.today().year
    seq = str(uuid_module.uuid4().int)[:5]
    return f"OS-{year}-{seq}"

@router.get("/")
async def list_work_orders(status: Optional[WorkOrderStatus]=None, priority: Optional[Priority]=None, asset_id: Optional[UUID]=None, assigned_to_id: Optional[UUID]=None, maintenance_type: Optional[MaintenanceType]=None, from_date: Optional[datetime]=None, to_date: Optional[datetime]=None, skip: int=0, limit: int=50, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    q = select(WorkOrder)
    if status: q = q.where(WorkOrder.status == status)
    if priority: q = q.where(WorkOrder.priority == priority)
    if asset_id: q = q.where(WorkOrder.asset_id == asset_id)
    if assigned_to_id: q = q.where(WorkOrder.assigned_to_id == assigned_to_id)
    if maintenance_type: q = q.where(WorkOrder.maintenance_type == maintenance_type)
    if from_date: q = q.where(WorkOrder.created_at >= from_date)
    if to_date: q = q.where(WorkOrder.created_at <= to_date)
    q = q.offset(skip).limit(limit).order_by(WorkOrder.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/my-orders")
async def my_work_orders(db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.assigned_to_id == current_user.id, WorkOrder.status.not_in([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])).order_by(WorkOrder.priority, WorkOrder.scheduled_start))
    return result.scalars().all()

@router.get("/kpis")
async def work_order_kpis(db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    total = (await db.execute(select(func.count(WorkOrder.id)))).scalar()
    open_orders = (await db.execute(select(func.count(WorkOrder.id)).where(WorkOrder.status.not_in([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])))).scalar()
    overdue = (await db.execute(select(func.count(WorkOrder.id)).where(and_(WorkOrder.scheduled_end < datetime.utcnow(), WorkOrder.status.not_in([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED]))))).scalar()
    avg_duration = (await db.execute(select(func.avg(WorkOrder.actual_duration_h)).where(WorkOrder.status == WorkOrderStatus.COMPLETED))).scalar()
    by_status = await db.execute(select(WorkOrder.status, func.count(WorkOrder.id)).group_by(WorkOrder.status))
    by_priority = await db.execute(select(WorkOrder.priority, func.count(WorkOrder.id)).group_by(WorkOrder.priority))
    return {"total": total, "open": open_orders, "overdue": overdue, "avg_duration_hours": round(avg_duration or 0, 2), "by_status": {r[0]: r[1] for r in by_status}, "by_priority": {r[0]: r[1] for r in by_priority}}

@router.post("/", status_code=201)
async def create_work_order(body: WorkOrderCreate, db: AsyncSession=Depends(get_db), current_user: User=Depends(require_technician)):
    wo = WorkOrder(**body.model_dump(), number=generate_os_number(), created_by_id=current_user.id)
    db.add(wo)
    await db.flush()
    await db.refresh(wo)
    return wo

@router.get("/{wo_id}")
async def get_work_order(wo_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo: raise HTTPException(status_code=404, detail="OS nao encontrada")
    return wo

@router.patch("/{wo_id}")
async def update_work_order(wo_id: UUID, body: WorkOrderUpdate, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo: raise HTTPException(status_code=404, detail="OS nao encontrada")
    update_data = body.model_dump(exclude_none=True)
    if body.status == WorkOrderStatus.IN_PROGRESS and not wo.actual_start:
        update_data["actual_start"] = datetime.utcnow()
    if body.status == WorkOrderStatus.COMPLETED and wo.actual_start:
        update_data["actual_end"] = datetime.utcnow()
        delta = (datetime.utcnow() - wo.actual_start).total_seconds() / 3600
        update_data["actual_duration_h"] = round(delta, 2)
    for k, v in update_data.items():
        setattr(wo, k, v)
    await db.commit()
    await db.refresh(wo)
    return wo

@router.post("/{wo_id}/assign")
async def assign_work_order(wo_id: UUID, technician_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo: raise HTTPException(status_code=404, detail="OS nao encontrada")
    wo.assigned_to_id = technician_id
    wo.status = WorkOrderStatus.ASSIGNED
    await db.commit()
    return {"id": str(wo_id), "assigned_to_id": str(technician_id), "status": wo.status}

@router.post("/{wo_id}/start")
async def start_work_order(wo_id: UUID, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo: raise HTTPException(status_code=404, detail="OS nao encontrada")
    if wo.status not in [WorkOrderStatus.PENDING, WorkOrderStatus.ASSIGNED]:
        raise HTTPException(status_code=400, detail="OS nao pode ser iniciada")
    wo.status = WorkOrderStatus.IN_PROGRESS
    wo.actual_start = datetime.utcnow()
    await db.commit()
    return {"id": str(wo_id), "status": wo.status, "actual_start": wo.actual_start}

@router.post("/{wo_id}/complete")
async def complete_work_order(wo_id: UUID, observations: Optional[str]=None, db: AsyncSession=Depends(get_db), current_user: User=Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo: raise HTTPException(status_code=404, detail="OS nao encontrada")
    if wo.status != WorkOrderStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="OS precisa estar em progresso para ser concluida")
    
@router.post("/{wo_id}/photos")
async def upload_photo(wo_id: UUID, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="OS nao encontrada")
    contents = await file.read()
    upload_result = cloudinary.uploader.upload(contents, folder=f"sgm/work-orders/{wo_id}", resource_type="image")
    photos = wo.photos or []
    photos.append({"url": upload_result["secure_url"], "public_id": upload_result["public_id"], "uploaded_at": datetime.utcnow().isoformat(), "uploaded_by": str(current_user.id)})
    wo.photos = photos
    await db.commit()
    await db.refresh(wo)
    return {"url": upload_result["secure_url"], "photos": wo.photos}

@router.delete("/{wo_id}/photos/{public_id:path}")
async def delete_photo(wo_id: UUID, public_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="OS nao encontrada")
    cloudinary.uploader.destroy(public_id)
    photos = [p for p in (wo.photos or []) if p.get("public_id") != public_id]
    wo.photos = photos
    await db.commit()
    return {"photos": wo.photos}
    wo.status = WorkOrderStatus.COMPLETED
    wo.actual_end = datetime.utcnow()
    if wo.actual_start:
        delta = (datetime.utcnow() - wo.actual_start).total_seconds() / 3600
        wo.actual_duration_h = round(delta, 2)
    if observations:
        wo.observations = observations
    await db.commit()
    return {"id": str(wo_id), "status": wo.status, "actual_duration_h": wo.actual_duration_h}

@router.delete("/{wo_id}", status_code=204)
async def cancel_work_order(wo_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo: raise HTTPException(status_code=404, detail="OS nao encontrada")
    if wo.status == WorkOrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="OS concluida nao pode ser cancelada")
    wo.status = WorkOrderStatus.CANCELLED
    await db.commit()

@router.post("/{wo_id}/sync-erp")
async def sync_to_erp(wo_id: UUID, db: AsyncSession=Depends(get_db), _: User=Depends(require_manager)):
    from app.services.erp_sync_service import sync_work_order_to_erp
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo: raise HTTPException(status_code=404, detail="OS nao encontrada")
    synced = await sync_work_order_to_erp(wo)
    return {"synced": synced, "erp_wo_id": wo.erp_wo_id}

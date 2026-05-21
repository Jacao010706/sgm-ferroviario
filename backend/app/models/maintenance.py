import uuid
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text, Integer, JSON, Interval
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.core.database import Base


class MaintenanceType(str, enum.Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    PREDICTIVE = "predictive"
    INSPECTION = "inspection"
    CALIBRATION = "calibration"
    EMERGENCY = "emergency"


class Frequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMIANNUAL = "semiannual"
    ANNUAL = "annual"
    BIENNIAL = "biennial"
    CUSTOM_DAYS = "custom_days"


class WorkOrderStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    WAITING_PARTS = "waiting_parts"
    WAITING_APPROVAL = "waiting_approval"


class Priority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class MaintenancePlan(Base):
    __tablename__ = "maintenance_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"))
    maintenance_type: Mapped[MaintenanceType] = mapped_column(SAEnum(MaintenanceType))
    frequency: Mapped[Frequency] = mapped_column(SAEnum(Frequency))
    frequency_days: Mapped[int | None] = mapped_column(Integer)
    estimated_duration_h: Mapped[float] = mapped_column(Float, default=1.0)
    priority: Mapped[Priority] = mapped_column(SAEnum(Priority), default=Priority.MEDIUM)
    checklist: Mapped[list | None] = mapped_column(JSON)
    required_skills: Mapped[list | None] = mapped_column(JSON)
    required_parts: Mapped[list | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_executed: Mapped[datetime | None] = mapped_column(DateTime)
    next_due: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    erp_plan_id: Mapped[str | None] = mapped_column(String(100))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="maintenance_plans")
    work_orders: Mapped[list["WorkOrder"]] = relationship("WorkOrder", back_populates="maintenance_plan")


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"))
    sub_asset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    maintenance_type: Mapped[MaintenanceType] = mapped_column(SAEnum(MaintenanceType))
    status: Mapped[WorkOrderStatus] = mapped_column(SAEnum(WorkOrderStatus), default=WorkOrderStatus.PENDING, index=True)
    priority: Mapped[Priority] = mapped_column(SAEnum(Priority), default=Priority.MEDIUM)
    maintenance_plan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("maintenance_plans.id"))
    alert_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("alerts.id"))
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime)
    scheduled_end: Mapped[datetime | None] = mapped_column(DateTime)
    actual_start: Mapped[datetime | None] = mapped_column(DateTime)
    actual_end: Mapped[datetime | None] = mapped_column(DateTime)
    estimated_duration_h: Mapped[float | None] = mapped_column(Float)
    actual_duration_h: Mapped[float | None] = mapped_column(Float)
    checklist_progress: Mapped[dict | None] = mapped_column(JSON)
    parts_used: Mapped[list | None] = mapped_column(JSON)
    observations: Mapped[str | None] = mapped_column(Text)
    root_cause: Mapped[str | None] = mapped_column(Text)
    corrective_action: Mapped[str | None] = mapped_column(Text)
    photos: Mapped[list | None] = mapped_column(JSON)
    signature_url: Mapped[str | None] = mapped_column(String(500))
    erp_wo_id: Mapped[str | None] = mapped_column(String(100))
    synced_erp: Mapped[bool] = mapped_column(Boolean, default=False)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime)
    team_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    contractor_name: Mapped[str | None] = mapped_column(String(200))
    contractor_document: Mapped[str | None] = mapped_column(String(20))
    internal_hours: Mapped[float | None] = mapped_column(Float)
    contractor_hours: Mapped[float | None] = mapped_column(Float)
    # Campo para abastecimento de combustivel
    fuel_liters_added: Mapped[float | None] = mapped_column(Float, nullable=True)
    sub_asset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="work_orders", foreign_keys="[WorkOrder.asset_id]")
    maintenance_plan: Mapped["MaintenancePlan | None"] = relationship("MaintenancePlan", back_populates="work_orders")
    assigned_to: Mapped["User | None"] = relationship("User", back_populates="work_orders", foreign_keys="[WorkOrder.assigned_to_id]")
    alert: Mapped["Alert | None"] = relationship("Alert", back_populates="work_order")
    team: Mapped["Team | None"] = relationship("Team", back_populates="work_orders")

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text, Integer, JSON, Interval
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.core.database import Base


class MaintenanceType(str, enum.Enum):
    PREVENTIVE = "preventive"       # Manutenção preventiva programada
    CORRECTIVE = "corrective"       # Manutenção corretiva
    PREDICTIVE = "predictive"       # Manutenção preditiva (baseada em IoT)
    INSPECTION = "inspection"       # Inspeção periódica
    CALIBRATION = "calibration"     # Calibração de instrumentos
    EMERGENCY = "emergency"         # Emergência


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
    PENDING = "pending"             # Aguardando
    ASSIGNED = "assigned"           # Atribuída
    IN_PROGRESS = "in_progress"     # Em execução
    PAUSED = "paused"              # Pausada
    COMPLETED = "completed"         # Concluída
    CANCELLED = "cancelled"         # Cancelada
    WAITING_PARTS = "waiting_parts" # Aguardando peças
    WAITING_APPROVAL = "waiting_approval"


class Priority(str, enum.Enum):
    CRITICAL = "critical"    # P1 - imediata
    HIGH = "high"           # P2 - até 4h
    MEDIUM = "medium"       # P3 - até 24h
    LOW = "low"             # P4 - programada


class MaintenancePlan(Base):
    """Plano de Manutenção Preventiva (PMP)"""
    __tablename__ = "maintenance_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"))
    maintenance_type: Mapped[MaintenanceType] = mapped_column(SAEnum(MaintenanceType))
    frequency: Mapped[Frequency] = mapped_column(SAEnum(Frequency))
    frequency_days: Mapped[int | None] = mapped_column(Integer)   # para CUSTOM_DAYS
    estimated_duration_h: Mapped[float] = mapped_column(Float, default=1.0)
    priority: Mapped[Priority] = mapped_column(SAEnum(Priority), default=Priority.MEDIUM)
    checklist: Mapped[list | None] = mapped_column(JSON)           # lista de verificação
    required_skills: Mapped[list | None] = mapped_column(JSON)
    required_parts: Mapped[list | None] = mapped_column(JSON)      # peças necessárias
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_executed: Mapped[datetime | None] = mapped_column(DateTime)
    next_due: Mapped[datetime | None] = mapped_column(DateTime, index=True)
    erp_plan_id: Mapped[str | None] = mapped_column(String(100))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="maintenance_plans")
    work_orders: Mapped[list["WorkOrder"]] = relationship("WorkOrder", back_populates="maintenance_plan")


class WorkOrder(Base):
    """Ordem de Serviço (OS)"""
    __tablename__ = "work_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # OS-2024-00001
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"))
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
    photos: Mapped[list | None] = mapped_column(JSON)               # paths das fotos
    signature_url: Mapped[str | None] = mapped_column(String(500))
    erp_wo_id: Mapped[str | None] = mapped_column(String(100))     # ID no ERP
    synced_erp: Mapped[bool] = mapped_column(Boolean, default=False)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="work_orders")
    maintenance_plan: Mapped["MaintenancePlan | None"] = relationship("MaintenancePlan", back_populates="work_orders")
    assigned_to: Mapped["User | None"] = relationship("User", back_populates="work_orders", foreign_keys=[assigned_to_id])
    alert: Mapped["Alert | None"] = relationship("Alert", back_populates="work_order")

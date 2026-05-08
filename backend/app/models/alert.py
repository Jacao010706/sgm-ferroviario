import uuid
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.core.database import Base


class AlertSeverity(str, enum.Enum):
    CRITICAL = "critical"   # Risco imediato - para operação
    HIGH = "high"           # Degradação severa
    MEDIUM = "medium"       # Atenção necessária
    LOW = "low"             # Informativo
    INFO = "info"


class AlertSource(str, enum.Enum):
    SCADA = "scada"
    IOT_SENSOR = "iot_sensor"
    PREDICTIVE = "predictive"
    MANUAL = "manual"
    ERP = "erp"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"   # Reconhecido pelo operador
    IN_TREATMENT = "in_treatment"   # OS aberta
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"       # Suprimido temporariamente


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[AlertSeverity] = mapped_column(SAEnum(AlertSeverity), index=True)
    source: Mapped[AlertSource] = mapped_column(SAEnum(AlertSource))
    status: Mapped[AlertStatus] = mapped_column(SAEnum(AlertStatus), default=AlertStatus.ACTIVE, index=True)
    parameter: Mapped[str | None] = mapped_column(String(100))   # ex: "voltage_kv"
    value: Mapped[float | None] = mapped_column(Float)            # valor medido
    threshold: Mapped[float | None] = mapped_column(Float)        # limiar violado
    unit: Mapped[str | None] = mapped_column(String(20))
    raw_data: Mapped[dict | None] = mapped_column(JSON)           # payload completo do sensor
    acknowledged_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    triggered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="alerts")
    work_order: Mapped["WorkOrder | None"] = relationship("WorkOrder", back_populates="alert")

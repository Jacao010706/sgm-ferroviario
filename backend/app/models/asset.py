import uuid
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.core.database import Base


class AssetType(str, enum.Enum):
    SUBSTATION = "substation"           # Subestação retificadora
    GENERATOR = "generator"             # Gerador diesel/gás
    TRANSFORMER = "transformer"         # Transformador de potência
    RECTIFIER = "rectifier"            # Retificador
    INVERTER = "inverter"              # Inversor
    SWITCHGEAR = "switchgear"          # Painéis de manobra
    CATENARY = "catenary"              # Sistema catenária
    BATTERY_BANK = "battery_bank"      # Banco de baterias
    CIRCUIT_BREAKER = "circuit_breaker"
    MEASUREMENT = "measurement"        # Medidor de energia
    COOLING = "cooling"                # Sistema de refrigeração
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    OPERATIONAL = "operational"
    MAINTENANCE = "maintenance"        # Em manutenção
    FAILURE = "failure"               # Em falha
    STANDBY = "standby"              # Reserva fria
    DECOMMISSIONED = "decommissioned" # Desativado


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tag: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # Ex: SE-001, GE-003
    name: Mapped[str] = mapped_column(String(200))
    asset_type: Mapped[AssetType] = mapped_column(SAEnum(AssetType))
    status: Mapped[AssetStatus] = mapped_column(SAEnum(AssetStatus), default=AssetStatus.OPERATIONAL)
    manufacturer: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str | None] = mapped_column(String(100))
    serial_number: Mapped[str | None] = mapped_column(String(100))
    installation_date: Mapped[datetime | None] = mapped_column(DateTime)
    warranty_expiry: Mapped[datetime | None] = mapped_column(DateTime)
    location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id"))
    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"))
    description: Mapped[str | None] = mapped_column(Text)
    specifications: Mapped[dict | None] = mapped_column(JSON)  # dados técnicos flexíveis
    nominal_voltage_kv: Mapped[float | None] = mapped_column(Float)
    nominal_power_kva: Mapped[float | None] = mapped_column(Float)
    nominal_current_a: Mapped[float | None] = mapped_column(Float)
    qr_code: Mapped[str | None] = mapped_column(String(200))
    erp_asset_id: Mapped[str | None] = mapped_column(String(100))  # ID no ERP
    scada_node_id: Mapped[str | None] = mapped_column(String(200))  # OPC-UA node
    modbus_address: Mapped[int | None] = mapped_column(Integer)
    mqtt_topic: Mapped[str | None] = mapped_column(String(300))
    criticality: Mapped[int] = mapped_column(Integer, default=3)  # 1=crítico, 5=baixo
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    location: Mapped["Location"] = relationship("Location", back_populates="assets")
    children: Mapped[list["Asset"]] = relationship("Asset", back_populates="parent")
    parent: Mapped["Asset | None"] = relationship("Asset", back_populates="children", remote_side="Asset.id")
    maintenance_plans: Mapped[list["MaintenancePlan"]] = relationship("MaintenancePlan", back_populates="asset")
    work_orders: Mapped[list["WorkOrder"]] = relationship("WorkOrder", back_populates="asset")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="asset")
    iot_readings: Mapped[list["IoTReading"]] = relationship("IoTReading", back_populates="asset")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(20), unique=True)  # Ex: EST-001 (Estação)
    line: Mapped[str | None] = mapped_column(String(50))         # Linha ferroviária
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    address: Mapped[str | None] = mapped_column(Text)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id"))

    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="location")
    children: Mapped[list["Location"]] = relationship("Location", back_populates="parent")
    parent: Mapped["Location | None"] = relationship("Location", back_populates="children", remote_side="Location.id")

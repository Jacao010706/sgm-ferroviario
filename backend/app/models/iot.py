import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum as SAEnum, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.core.database import Base


class ReadingType(str, enum.Enum):
    VOLTAGE = "voltage"               # Tensão (kV)
    CURRENT = "current"               # Corrente (A)
    POWER = "power"                   # Potência (kW/kVA)
    POWER_FACTOR = "power_factor"     # Fator de potência
    FREQUENCY = "frequency"           # Frequência (Hz)
    TEMPERATURE = "temperature"       # Temperatura (°C)
    VIBRATION = "vibration"           # Vibração (mm/s)
    OIL_LEVEL = "oil_level"          # Nível de óleo (%)
    OIL_TEMP = "oil_temp"            # Temperatura do óleo (°C)
    HUMIDITY = "humidity"             # Umidade relativa (%)
    FUEL_LEVEL = "fuel_level"        # Nível de combustível (%)
    RPM = "rpm"                       # Rotação (RPM)
    BATTERY_VOLTAGE = "battery_voltage"
    ENERGY_KWH = "energy_kwh"        # Energia consumida (kWh)
    STATUS = "status"                 # Status digital (0/1)


class IoTReading(Base):
    """Leituras de sensores IoT — armazenado como hypertable TimescaleDB"""
    __tablename__ = "iot_readings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), index=True)
    sensor_id: Mapped[str] = mapped_column(String(100))
    reading_type: Mapped[ReadingType] = mapped_column(SAEnum(ReadingType))
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(20))
    quality: Mapped[float | None] = mapped_column(Float)    # 0-100% qualidade do dado
    raw_payload: Mapped[dict | None] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(20))         # "mqtt" | "opcua" | "modbus"
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)

    asset: Mapped["Asset"] = relationship("Asset", back_populates="iot_readings")

    __table_args__ = (
        Index("idx_iot_asset_type_time", "asset_id", "reading_type", "timestamp"),
    )


class SensorConfig(Base):
    """Configuração de sensores por ativo"""
    __tablename__ = "sensor_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"))
    sensor_id: Mapped[str] = mapped_column(String(100))
    reading_type: Mapped[ReadingType] = mapped_column(SAEnum(ReadingType))
    mqtt_topic: Mapped[str | None] = mapped_column(String(300))
    scada_node_id: Mapped[str | None] = mapped_column(String(300))
    modbus_register: Mapped[int | None] = mapped_column()
    scale_factor: Mapped[float] = mapped_column(Float, default=1.0)
    offset: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str | None] = mapped_column(String(20))
    min_threshold: Mapped[float | None] = mapped_column(Float)
    max_threshold: Mapped[float | None] = mapped_column(Float)
    critical_min: Mapped[float | None] = mapped_column(Float)
    critical_max: Mapped[float | None] = mapped_column(Float)
    sampling_interval_s: Mapped[int] = mapped_column(default=60)
    is_active: Mapped[bool] = mapped_column(default=True)

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, Text, JSON, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class FuelOrderItem(Base):
    __tablename__ = "fuel_order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fuel_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fuel_orders.id"), index=True)
    subitem: Mapped[str | None] = mapped_column(String(20))
    station: Mapped[str] = mapped_column(String(200))
    forecast_liters: Mapped[float | None] = mapped_column(Float)
    supplied_liters: Mapped[float | None] = mapped_column(Float)
    ggd_automatic: Mapped[str | None] = mapped_column(String(10))

    fuel_order: Mapped["FuelOrder"] = relationship("FuelOrder", back_populates="items")


class FuelOrder(Base):
    __tablename__ = "fuel_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    execution_date: Mapped[datetime] = mapped_column(DateTime)
    location: Mapped[str | None] = mapped_column(String(200))
    sector: Mapped[str | None] = mapped_column(String(100))
    shift: Mapped[str | None] = mapped_column(String(20))
    week: Mapped[str | None] = mapped_column(String(10))
    supplier: Mapped[str | None] = mapped_column(String(300))
    fiscal_1: Mapped[str | None] = mapped_column(String(200))
    fiscal_2: Mapped[str | None] = mapped_column(String(200))

    additive_station: Mapped[str | None] = mapped_column(String(200))
    additive_forecast_ml: Mapped[float | None] = mapped_column(Float)
    additive_quantity_ml: Mapped[float | None] = mapped_column(Float)
    additive_completed: Mapped[str | None] = mapped_column(String(10))

    observations: Mapped[str | None] = mapped_column(Text)
    management_observations: Mapped[str | None] = mapped_column(Text)

    responsible_name: Mapped[str | None] = mapped_column(String(200))
    responsible_re: Mapped[str | None] = mapped_column(String(20))

    employee_1_name: Mapped[str | None] = mapped_column(String(200))
    employee_1_re: Mapped[str | None] = mapped_column(String(20))
    employee_2_name: Mapped[str | None] = mapped_column(String(200))
    employee_2_re: Mapped[str | None] = mapped_column(String(20))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    items: Mapped[list["FuelOrderItem"]] = relationship("FuelOrderItem", back_populates="fuel_order", cascade="all, delete-orphan")

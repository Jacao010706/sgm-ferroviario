from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
import asyncio
import json
import redis.asyncio as redis
from app.core.database import get_db
from app.core.config import settings
from app.models.iot import IoTReading, SensorConfig, ReadingType
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/iot", tags=["IoT & Telemetria"])


@router.get("/readings/{asset_id}")
async def get_asset_readings(
    asset_id: UUID,
    reading_type: Optional[ReadingType] = None,
    hours: int = Query(24, ge=1, le=720),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    q = select(IoTReading).where(
        IoTReading.asset_id == asset_id,
        IoTReading.timestamp >= since,
    )
    if reading_type:
        q = q.where(IoTReading.reading_type == reading_type)
    q = q.order_by(IoTReading.timestamp.asc())
    result = await db.execute(q)
    readings = result.scalars().all()
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "type": r.reading_type,
            "value": r.value,
            "unit": r.unit,
            "sensor_id": r.sensor_id,
        }
        for r in readings
    ]


@router.get("/readings/{asset_id}/latest")
async def get_latest_readings(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Última leitura de cada tipo de sensor para o ativo"""
    result = await db.execute(
        select(
            IoTReading.reading_type,
            func.max(IoTReading.timestamp).label("last_ts"),
            func.last(IoTReading.value, IoTReading.timestamp).label("last_value"),
        )
        .where(IoTReading.asset_id == asset_id)
        .group_by(IoTReading.reading_type)
    )
    return [
        {"type": row[0], "timestamp": row[1].isoformat(), "value": row[2]}
        for row in result
    ]


@router.get("/sensor-configs/{asset_id}")
async def get_sensor_configs(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SensorConfig).where(SensorConfig.asset_id == asset_id, SensorConfig.is_active == True)
    )
    return result.scalars().all()


# ─── WebSocket: telemetria em tempo real ────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, asset_id: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(asset_id, []).append(ws)

    def disconnect(self, asset_id: str, ws: WebSocket):
        if asset_id in self.connections:
            self.connections[asset_id].remove(ws)

    async def broadcast(self, asset_id: str, data: dict):
        for ws in self.connections.get(asset_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/{asset_id}")
async def telemetry_ws(asset_id: str, websocket: WebSocket):
    """WebSocket para telemetria em tempo real via Redis pub/sub"""
    await manager.connect(asset_id, websocket)
    r = redis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"telemetry:{asset_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                await websocket.send_json(data)
    except WebSocketDisconnect:
        manager.disconnect(asset_id, websocket)
    finally:
        await pubsub.unsubscribe(f"telemetry:{asset_id}")
        await r.aclose()
@router.post("/simulate/{asset_id}")
async def simulate_readings(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    import random
    now = datetime.utcnow()
    readings = [
        {"type": ReadingType.VOLTAGE, "value": round(random.uniform(209, 231), 1), "unit": "V", "sensor_id": "voltage_r"},
        {"type": ReadingType.VOLTAGE, "value": round(random.uniform(209, 231), 1), "unit": "V", "sensor_id": "voltage_s"},
        {"type": ReadingType.VOLTAGE, "value": round(random.uniform(209, 231), 1), "unit": "V", "sensor_id": "voltage_t"},
        {"type": ReadingType.CURRENT, "value": round(random.uniform(20, 80), 1), "unit": "A", "sensor_id": "current_r"},
        {"type": ReadingType.CURRENT, "value": round(random.uniform(20, 80), 1), "unit": "A", "sensor_id": "current_s"},
        {"type": ReadingType.CURRENT, "value": round(random.uniform(20, 80), 1), "unit": "A", "sensor_id": "current_t"},
        {"type": ReadingType.TEMPERATURE, "value": round(random.uniform(60, 95), 1), "unit": "C", "sensor_id": "temperature"},
        {"type": ReadingType.FUEL_LEVEL, "value": round(random.uniform(20, 100), 1), "unit": "%", "sensor_id": "fuel_level"},
        {"type": ReadingType.STATUS, "value": float(random.choice([0, 1])), "unit": "", "sensor_id": "mode"},
    ]
    for item in readings:
        reading = IoTReading(
            asset_id=asset_id,
            sensor_id=item["sensor_id"],
            reading_type=item["type"],
            value=item["value"],
            unit=item["unit"],
            source="simulator",
            timestamp=now,
        )
        db.add(reading)
    await db.commit()
    r_client = redis.from_url(settings.REDIS_URL)
    payload = {
        "asset_id": str(asset_id),
        "timestamp": now.isoformat(),
        "readings": [{"sensor_id": item["sensor_id"], "type": item["type"], "value": item["value"], "unit": item["unit"]} for item in readings]
    }
    await r_client.publish(f"telemetry:{asset_id}", json.dumps(payload))
    await r_client.aclose()
    return {"simulated": len(readings), "readings": payload["readings"]}
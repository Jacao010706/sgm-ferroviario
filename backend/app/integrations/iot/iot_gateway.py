"""
IoT Gateway: processa mensagens MQTT de sensores de campo,
normaliza dados e persiste leituras com detecção de anomalias.

Tópicos esperados:
  sgm/assets/{asset_tag}/telemetry    — dados de telemetria
  sgm/assets/{asset_tag}/status       — status do ativo (online/offline)
  sgm/assets/{asset_tag}/alert        — alertas diretos do dispositivo
  sgm/sensors/{sensor_id}/raw         — dados brutos de sensores

Payload telemetria (JSON):
{
  "ts": "2024-01-15T10:30:00Z",
  "voltage_kv": 13.8,
  "current_a": 450.0,
  "temperature_c": 65.2,
  "power_kw": 6210.0,
  "power_factor": 0.92,
  "vibration_mm_s": 2.1,
  "oil_level_pct": 85.0
}
"""
import asyncio
from datetime import datetime
import json
import structlog
import redis.asyncio as aioredis
from sqlalchemy import select
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.asset import Asset
from app.models.iot import IoTReading, SensorConfig, ReadingType
from app.models.alert import Alert, AlertSeverity, AlertSource, AlertStatus
from app.integrations.iot.mqtt_client import MQTTClient

log = structlog.get_logger(__name__)

TELEMETRY_FIELD_MAP = {
    "voltage_kv":      (ReadingType.VOLTAGE, "kV"),
    "current_a":       (ReadingType.CURRENT, "A"),
    "power_kw":        (ReadingType.POWER, "kW"),
    "power_factor":    (ReadingType.POWER_FACTOR, ""),
    "frequency_hz":    (ReadingType.FREQUENCY, "Hz"),
    "temperature_c":   (ReadingType.TEMPERATURE, "°C"),
    "oil_temp_c":      (ReadingType.OIL_TEMP, "°C"),
    "vibration_mm_s":  (ReadingType.VIBRATION, "mm/s"),
    "oil_level_pct":   (ReadingType.OIL_LEVEL, "%"),
    "humidity_pct":    (ReadingType.HUMIDITY, "%"),
    "fuel_level_pct":  (ReadingType.FUEL_LEVEL, "%"),
    "rpm":             (ReadingType.RPM, "RPM"),
    "battery_v":       (ReadingType.BATTERY_VOLTAGE, "V"),
    "energy_kwh":      (ReadingType.ENERGY_KWH, "kWh"),
}

# Thresholds padrão (sobrescritos por SensorConfig do banco)
DEFAULT_THRESHOLDS = {
    ReadingType.VOLTAGE:     {"min": settings.VOLTAGE_MIN_KV, "max": settings.VOLTAGE_MAX_KV},
    ReadingType.TEMPERATURE: {"max": settings.TEMP_MAX_C},
    ReadingType.OIL_TEMP:    {"max": 90.0},
    ReadingType.VIBRATION:   {"max": settings.VIBRATION_MAX_MM_S},
    ReadingType.FUEL_LEVEL:  {"min": 15.0},
    ReadingType.OIL_LEVEL:   {"min": 10.0},
}


class IoTGateway:
    def __init__(self):
        self.mqtt = MQTTClient()
        self.redis: aioredis.Redis | None = None
        self._asset_cache: dict[str, str] = {}  # tag -> uuid
        self._sensor_configs: dict[str, list[SensorConfig]] = {}

    async def start(self):
        log.info("Iniciando IoT Gateway")
        self.redis = await aioredis.from_url(settings.REDIS_URL)
        await self._load_cache()

        self.mqtt.subscribe("sgm/assets/+/telemetry", self._handle_telemetry)
        self.mqtt.subscribe("sgm/assets/+/status", self._handle_status)
        self.mqtt.subscribe("sgm/assets/+/alert", self._handle_device_alert)
        self.mqtt.subscribe("sgm/sensors/+/raw", self._handle_raw_sensor)

        await self.mqtt.run_forever()

    async def _load_cache(self):
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Asset.tag, Asset.id))
            self._asset_cache = {row[0]: str(row[1]) for row in result}
            configs = await db.execute(select(SensorConfig).where(SensorConfig.is_active == True))
            for sc in configs.scalars():
                self._sensor_configs.setdefault(str(sc.asset_id), []).append(sc)

    async def _handle_telemetry(self, topic: str, data: dict):
        asset_tag = topic.split("/")[2]
        asset_id = self._asset_cache.get(asset_tag)
        if not asset_id:
            log.warning("Ativo não encontrado para telemetria MQTT", tag=asset_tag)
            return

        ts_str = data.get("ts")
        timestamp = datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str else datetime.utcnow()

        readings_to_save = []
        alerts_to_check = []

        for field, value in data.items():
            if field == "ts" or not isinstance(value, (int, float)):
                continue
            mapping = TELEMETRY_FIELD_MAP.get(field)
            if not mapping:
                continue
            rtype, unit = mapping
            readings_to_save.append(IoTReading(
                asset_id=asset_id,
                sensor_id=f"mqtt_{asset_tag}_{field}",
                reading_type=rtype,
                value=float(value),
                unit=unit,
                source="mqtt",
                timestamp=timestamp,
                raw_payload=data,
            ))
            alerts_to_check.append((rtype, float(value), unit))

        if readings_to_save:
            async with AsyncSessionLocal() as db:
                db.add_all(readings_to_save)
                await db.commit()

        # Publicar telemetria no Redis (WebSocket)
        await self.redis.publish(
            f"telemetry:{asset_id}",
            json.dumps({k: v for k, v in data.items() if k != "ts"} | {"timestamp": timestamp.isoformat()}),
        )

        # Verificar alertas
        for rtype, value, unit in alerts_to_check:
            await self._check_alert(asset_id, rtype, value, unit, data)

    async def _handle_status(self, topic: str, data: dict):
        asset_tag = topic.split("/")[2]
        asset_id = self._asset_cache.get(asset_tag)
        if not asset_id:
            return
        online = data.get("online", True)
        if not online:
            await self._create_alert(
                asset_id=asset_id,
                title=f"Ativo {asset_tag} offline",
                description="Dispositivo IoT parou de enviar dados",
                severity=AlertSeverity.HIGH,
                source=AlertSource.IOT_SENSOR,
            )

    async def _handle_device_alert(self, topic: str, data: dict):
        asset_tag = topic.split("/")[2]
        asset_id = self._asset_cache.get(asset_tag)
        if not asset_id:
            return
        severity_map = {"critical": AlertSeverity.CRITICAL, "high": AlertSeverity.HIGH,
                        "medium": AlertSeverity.MEDIUM, "low": AlertSeverity.LOW}
        await self._create_alert(
            asset_id=asset_id,
            title=data.get("title", "Alerta do dispositivo"),
            description=data.get("description", ""),
            severity=severity_map.get(data.get("severity", "medium"), AlertSeverity.MEDIUM),
            source=AlertSource.IOT_SENSOR,
            raw_data=data,
        )

    async def _handle_raw_sensor(self, topic: str, data: dict):
        sensor_id = topic.split("/")[2]
        asset_id = data.get("asset_id")
        if not asset_id:
            return
        rtype_str = data.get("type")
        value = data.get("value")
        if not rtype_str or value is None:
            return
        try:
            rtype = ReadingType(rtype_str)
        except ValueError:
            return
        async with AsyncSessionLocal() as db:
            db.add(IoTReading(
                asset_id=asset_id,
                sensor_id=sensor_id,
                reading_type=rtype,
                value=float(value),
                unit=data.get("unit"),
                source="mqtt_raw",
                timestamp=datetime.utcnow(),
                raw_payload=data,
            ))
            await db.commit()

    async def _check_alert(self, asset_id: str, rtype: ReadingType, value: float, unit: str, raw: dict):
        thresholds = DEFAULT_THRESHOLDS.get(rtype, {})
        severity = None
        threshold_val = None
        direction = None

        if "max" in thresholds and value > thresholds["max"]:
            severity = AlertSeverity.HIGH
            threshold_val = thresholds["max"]
            direction = "acima"
        elif "min" in thresholds and value < thresholds["min"]:
            severity = AlertSeverity.HIGH
            threshold_val = thresholds["min"]
            direction = "abaixo"

        if not severity:
            return

        async with AsyncSessionLocal() as db:
            existing = await db.execute(
                select(Alert).where(
                    Alert.asset_id == asset_id,
                    Alert.parameter == rtype,
                    Alert.status == AlertStatus.ACTIVE,
                )
            )
            if existing.scalar_one_or_none():
                return

        await self._create_alert(
            asset_id=asset_id,
            title=f"{rtype.upper()} {direction} do limite: {value:.2f} {unit}",
            description=f"Valor medido: {value:.2f} {unit}. Limiar: {threshold_val:.2f} {unit}",
            severity=severity,
            source=AlertSource.IOT_SENSOR,
            parameter=rtype,
            value=value,
            threshold=threshold_val,
            unit=unit,
            raw_data=raw,
        )

    async def _create_alert(self, asset_id: str, title: str, description: str,
                             severity: AlertSeverity, source: AlertSource,
                             parameter: str = None, value: float = None,
                             threshold: float = None, unit: str = None, raw_data: dict = None):
        async with AsyncSessionLocal() as db:
            alert = Alert(
                asset_id=asset_id,
                title=title,
                description=description,
                severity=severity,
                source=source,
                parameter=parameter,
                value=value,
                threshold=threshold,
                unit=unit,
                raw_data=raw_data,
                triggered_at=datetime.utcnow(),
            )
            db.add(alert)
            await db.commit()
            log.warning("Alerta IoT criado", asset=asset_id, severity=severity, title=title)

            from app.tasks.maintenance_tasks import send_alert_notification
            send_alert_notification.delay(str(alert.id))

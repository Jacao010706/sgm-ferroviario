"""
Gateway SCADA: orquestra OPC-UA e Modbus, normaliza dados e
persiste leituras + dispara alertas quando limiares são violados.
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
from app.integrations.scada.opcua_client import OPCUAClient
from app.integrations.scada.modbus_client import ModbusClient

log = structlog.get_logger(__name__)

SCADA_TO_READING_TYPE = {
    "voltage_a_kv": ReadingType.VOLTAGE,
    "voltage_b_kv": ReadingType.VOLTAGE,
    "voltage_c_kv": ReadingType.VOLTAGE,
    "current_a_a":  ReadingType.CURRENT,
    "power_kw":     ReadingType.POWER,
    "power_factor": ReadingType.POWER_FACTOR,
    "frequency_hz": ReadingType.FREQUENCY,
    "oil_temp_c":   ReadingType.OIL_TEMP,
    "coolant_temp_c": ReadingType.TEMPERATURE,
    "fuel_level_pct": ReadingType.FUEL_LEVEL,
    "rpm":          ReadingType.RPM,
    "energy_kwh":   ReadingType.ENERGY_KWH,
}


class ScadaGateway:
    def __init__(self):
        self.opcua = OPCUAClient()
        self.modbus = ModbusClient()
        self.redis: aioredis.Redis | None = None
        self._active_sensors: list[SensorConfig] = []

    async def start(self):
        log.info("Iniciando SCADA Gateway")
        self.redis = await aioredis.from_url(settings.REDIS_URL)

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SensorConfig).where(SensorConfig.is_active == True)
            )
            self._active_sensors = result.scalars().all()

        opcua_nodes = [s.scada_node_id for s in self._active_sensors if s.scada_node_id]
        modbus_devices = [
            {"unit_id": s.modbus_register, "type": "energy_meter", "asset_id": str(s.asset_id)}
            for s in self._active_sensors if s.modbus_register
        ]

        self.opcua.on_data_change(self._handle_opcua_data)
        self.modbus.on_data(self._handle_modbus_data)

        tasks = []
        if opcua_nodes:
            tasks.append(asyncio.create_task(self.opcua.run_forever(opcua_nodes)))
        if modbus_devices:
            tasks.append(asyncio.create_task(self._run_modbus(modbus_devices)))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _run_modbus(self, devices: list):
        try:
            await self.modbus.connect()
            await self.modbus.poll_loop(devices, interval_s=10)
        except Exception as e:
            log.error("Modbus gateway falhou", error=str(e))

    async def _handle_opcua_data(self, node_id: str, value: float, timestamp: datetime):
        sensor = next((s for s in self._active_sensors if s.scada_node_id == node_id), None)
        if not sensor:
            return
        scaled = value * sensor.scale_factor + sensor.offset
        await self._persist_and_alert(sensor, scaled, "opcua", timestamp)

    async def _handle_modbus_data(self, data: dict):
        asset_id = data.pop("asset_id", None)
        source = data.pop("source", "modbus")
        ts_str = data.pop("timestamp", None)
        timestamp = datetime.fromisoformat(ts_str) if ts_str else datetime.utcnow()
        for param, value in data.items():
            if not isinstance(value, (int, float)):
                continue
            sensor = next(
                (s for s in self._active_sensors
                 if str(s.asset_id) == asset_id and s.reading_type == SCADA_TO_READING_TYPE.get(param)),
                None,
            )
            if sensor:
                await self._persist_and_alert(sensor, value, source, timestamp)
            else:
                await self._save_reading_direct(asset_id, param, value, source, timestamp)

    async def _persist_and_alert(self, sensor: SensorConfig, value: float, source: str, timestamp: datetime):
        async with AsyncSessionLocal() as db:
            reading = IoTReading(
                asset_id=sensor.asset_id,
                sensor_id=sensor.sensor_id,
                reading_type=sensor.reading_type,
                value=value,
                unit=sensor.unit,
                source=source,
                timestamp=timestamp,
            )
            db.add(reading)
            await db.commit()

        # Publicar no Redis para WebSocket
        await self.redis.publish(
            f"telemetry:{sensor.asset_id}",
            json.dumps({
                "type": sensor.reading_type,
                "value": value,
                "unit": sensor.unit,
                "timestamp": timestamp.isoformat(),
                "sensor_id": sensor.sensor_id,
            }),
        )

        # Verificar limiar e criar alerta
        await self._check_thresholds(sensor, value, source, timestamp)

    async def _check_thresholds(self, sensor: SensorConfig, value: float, source: str, timestamp: datetime):
        severity = None
        direction = None

        if sensor.critical_max is not None and value > sensor.critical_max:
            severity = AlertSeverity.CRITICAL
            direction = "acima"
            threshold = sensor.critical_max
        elif sensor.critical_min is not None and value < sensor.critical_min:
            severity = AlertSeverity.CRITICAL
            direction = "abaixo"
            threshold = sensor.critical_min
        elif sensor.max_threshold is not None and value > sensor.max_threshold:
            severity = AlertSeverity.HIGH
            direction = "acima"
            threshold = sensor.max_threshold
        elif sensor.min_threshold is not None and value < sensor.min_threshold:
            severity = AlertSeverity.HIGH
            direction = "abaixo"
            threshold = sensor.min_threshold

        if not severity:
            return

        async with AsyncSessionLocal() as db:
            existing = await db.execute(
                select(Alert).where(
                    Alert.asset_id == sensor.asset_id,
                    Alert.parameter == sensor.reading_type,
                    Alert.status == AlertStatus.ACTIVE,
                )
            )
            if existing.scalar_one_or_none():
                return  # Alerta já ativo para este parâmetro

            alert = Alert(
                asset_id=sensor.asset_id,
                title=f"{sensor.reading_type.upper()} {direction} do limite: {value:.2f} {sensor.unit or ''}",
                description=f"Valor medido: {value:.2f}. Limiar: {threshold:.2f}. Sensor: {sensor.sensor_id}",
                severity=severity,
                source=AlertSource.SCADA if "opc" in source else AlertSource.IOT_SENSOR,
                parameter=sensor.reading_type,
                value=value,
                threshold=threshold,
                unit=sensor.unit,
                triggered_at=timestamp,
            )
            db.add(alert)
            await db.commit()
            log.warning("Alerta gerado", severity=severity, asset=str(sensor.asset_id), param=sensor.reading_type)

            # Notificação assíncrona via Celery
            from app.tasks.maintenance_tasks import send_alert_notification
            send_alert_notification.delay(str(alert.id))

    async def _save_reading_direct(self, asset_id: str, param: str, value: float, source: str, timestamp: datetime):
        rtype = SCADA_TO_READING_TYPE.get(param)
        if not rtype:
            return
        async with AsyncSessionLocal() as db:
            reading = IoTReading(
                asset_id=asset_id,
                sensor_id=f"{source}_{param}",
                reading_type=rtype,
                value=value,
                source=source,
                timestamp=timestamp,
            )
            db.add(reading)
            await db.commit()

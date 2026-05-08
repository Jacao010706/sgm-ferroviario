"""
Cliente Modbus TCP para leitura de PLCs, RTUs e medidores de energia.
Suporta leitura de registradores holding/input e coils.
"""
import asyncio
import structlog
from pymodbus.client import AsyncModbusTcpClient
from pymodbus.exceptions import ModbusException
from typing import Callable
from app.core.config import settings

log = structlog.get_logger(__name__)

# Mapa de registradores padrão para medidores de energia (IEC 62056 / ABNT)
ENERGY_METER_REGISTERS = {
    "voltage_a_kv":   {"address": 0,  "count": 2, "scale": 0.1},
    "voltage_b_kv":   {"address": 2,  "count": 2, "scale": 0.1},
    "voltage_c_kv":   {"address": 4,  "count": 2, "scale": 0.1},
    "current_a_a":    {"address": 6,  "count": 2, "scale": 0.01},
    "current_b_a":    {"address": 8,  "count": 2, "scale": 0.01},
    "current_c_a":    {"address": 10, "count": 2, "scale": 0.01},
    "power_kw":       {"address": 12, "count": 2, "scale": 0.1},
    "power_kvar":     {"address": 14, "count": 2, "scale": 0.1},
    "power_factor":   {"address": 16, "count": 1, "scale": 0.001},
    "frequency_hz":   {"address": 17, "count": 1, "scale": 0.01},
    "energy_kwh":     {"address": 18, "count": 2, "scale": 1.0},
}

# Registradores padrão para geradores
GENERATOR_REGISTERS = {
    "rpm":            {"address": 100, "count": 1, "scale": 1.0},
    "oil_temp_c":     {"address": 101, "count": 1, "scale": 0.1},
    "coolant_temp_c": {"address": 102, "count": 1, "scale": 0.1},
    "fuel_level_pct": {"address": 103, "count": 1, "scale": 0.1},
    "battery_v":      {"address": 104, "count": 1, "scale": 0.01},
    "output_v":       {"address": 105, "count": 2, "scale": 0.1},
    "output_kw":      {"address": 107, "count": 2, "scale": 0.1},
    "run_hours":      {"address": 109, "count": 2, "scale": 1.0},
}


class ModbusClient:
    def __init__(self, host: str = None, port: int = None):
        self.host = host or settings.MODBUS_HOST
        self.port = port or settings.MODBUS_PORT
        self.client = AsyncModbusTcpClient(host=self.host, port=self.port)
        self._callbacks: list[Callable] = []
        self._running = False

    def on_data(self, callback: Callable):
        self._callbacks.append(callback)

    async def connect(self):
        connected = await self.client.connect()
        if not connected:
            raise ConnectionError(f"Modbus: falha ao conectar em {self.host}:{self.port}")
        log.info("Modbus TCP conectado", host=self.host, port=self.port)

    async def disconnect(self):
        self.client.close()

    def _decode_float32(self, registers: list, scale: float = 1.0) -> float:
        """Decodifica dois registradores de 16 bits como float32"""
        import struct
        raw = struct.pack(">HH", registers[0], registers[1])
        value = struct.unpack(">f", raw)[0]
        return round(value * scale, 4)

    def _decode_uint16(self, register: int, scale: float = 1.0) -> float:
        return round(register * scale, 4)

    async def read_energy_meter(self, unit_id: int = 1) -> dict:
        """Lê todos os parâmetros de um medidor de energia"""
        data = {"unit_id": unit_id, "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
        for param, cfg in ENERGY_METER_REGISTERS.items():
            try:
                result = await self.client.read_holding_registers(
                    address=cfg["address"], count=cfg["count"], slave=unit_id
                )
                if result.isError():
                    continue
                if cfg["count"] == 2:
                    data[param] = self._decode_float32(result.registers, cfg["scale"])
                else:
                    data[param] = self._decode_uint16(result.registers[0], cfg["scale"])
            except ModbusException as e:
                log.warning("Erro Modbus ao ler parâmetro", param=param, error=str(e))
        return data

    async def read_generator(self, unit_id: int = 1) -> dict:
        """Lê todos os parâmetros de um gerador"""
        data = {"unit_id": unit_id, "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
        for param, cfg in GENERATOR_REGISTERS.items():
            try:
                result = await self.client.read_holding_registers(
                    address=cfg["address"], count=cfg["count"], slave=unit_id
                )
                if result.isError():
                    continue
                if cfg["count"] == 2:
                    data[param] = self._decode_float32(result.registers, cfg["scale"])
                else:
                    data[param] = self._decode_uint16(result.registers[0], cfg["scale"])
            except ModbusException as e:
                log.warning("Erro Modbus ao ler gerador", param=param, error=str(e))
        return data

    async def read_coil(self, address: int, unit_id: int = 1) -> bool:
        result = await self.client.read_coils(address=address, count=1, slave=unit_id)
        return bool(result.bits[0]) if not result.isError() else False

    async def poll_loop(self, devices: list[dict], interval_s: int = 5):
        """
        devices: [{"unit_id": 1, "type": "energy_meter", "asset_id": "uuid"}]
        """
        self._running = True
        while self._running:
            for device in devices:
                try:
                    if device["type"] == "energy_meter":
                        data = await self.read_energy_meter(device["unit_id"])
                    elif device["type"] == "generator":
                        data = await self.read_generator(device["unit_id"])
                    else:
                        continue
                    data["asset_id"] = device["asset_id"]
                    data["source"] = "modbus"
                    for cb in self._callbacks:
                        await cb(data)
                except Exception as e:
                    log.error("Erro no poll Modbus", device=device, error=str(e))
            await asyncio.sleep(interval_s)

    async def stop(self):
        self._running = False
        await self.disconnect()

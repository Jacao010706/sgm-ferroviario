"""
Cliente OPC-UA para leitura de dados SCADA de subestações.
Suporta IEC 61850 via OPC-UA e estrutura de nós padrão para equipamentos elétricos.
"""
import asyncio
from datetime import datetime
from typing import Callable, Any
import structlog
from asyncua import Client, ua
from asyncua.common.subscription import SubHandler
from app.core.config import settings

log = structlog.get_logger(__name__)


class ScadaSubscriptionHandler(SubHandler):
    def __init__(self, callback: Callable):
        self.callback = callback

    def datachange_notification(self, node, val, data):
        asyncio.create_task(
            self.callback(str(node.nodeid), val, data.monitored_item.Value.SourceTimestamp)
        )

    def event_notification(self, event):
        log.info("SCADA event", event=event)


class OPCUAClient:
    def __init__(self):
        self.url = settings.OPCUA_SERVER_URL
        self.client: Client | None = None
        self.subscription = None
        self._running = False
        self._data_callbacks: list[Callable] = []

    def on_data_change(self, callback: Callable):
        self._data_callbacks.append(callback)

    async def connect(self):
        self.client = Client(url=self.url)
        try:
            await self.client.connect()
            log.info("OPC-UA conectado", url=self.url)
        except Exception as e:
            log.error("Falha ao conectar OPC-UA", error=str(e), url=self.url)
            raise

    async def disconnect(self):
        if self.client:
            await self.client.disconnect()
            log.info("OPC-UA desconectado")

    async def read_node(self, node_id: str) -> Any:
        """Leitura pontual de um nó OPC-UA"""
        node = self.client.get_node(node_id)
        value = await node.read_value()
        return value

    async def read_substation_data(self, node_id: str) -> dict:
        """
        Lê bloco de dados de uma subestação retificadora.
        Estrutura baseada em IEC 61850 MMXU (Measurement Unit).
        """
        node = self.client.get_node(node_id)
        children = await node.get_children()
        data = {"node_id": node_id, "timestamp": datetime.utcnow().isoformat()}
        for child in children:
            try:
                name = (await child.read_browse_name()).Name
                val = await child.read_value()
                data[name] = val
            except Exception:
                pass
        return data

    async def subscribe_nodes(self, node_ids: list[str], interval_ms: int = 1000):
        """Subscrição OPC-UA para recebimento de dados em tempo real"""
        handler = ScadaSubscriptionHandler(self._dispatch_data)
        self.subscription = await self.client.create_subscription(interval_ms, handler)
        nodes = [self.client.get_node(nid) for nid in node_ids]
        await self.subscription.subscribe_data_change(nodes)
        log.info("Subscrito em nós OPC-UA", count=len(node_ids))

    async def _dispatch_data(self, node_id: str, value: Any, timestamp: datetime):
        for cb in self._data_callbacks:
            try:
                await cb(node_id, value, timestamp)
            except Exception as e:
                log.error("Erro em callback OPC-UA", error=str(e))

    async def run_forever(self, node_ids: list[str]):
        """Loop de reconexão automática"""
        self._running = True
        while self._running:
            try:
                await self.connect()
                await self.subscribe_nodes(node_ids)
                while self._running:
                    await asyncio.sleep(5)
            except Exception as e:
                log.error("OPC-UA desconectado, reconectando em 10s", error=str(e))
                await asyncio.sleep(10)

    async def stop(self):
        self._running = False
        await self.disconnect()

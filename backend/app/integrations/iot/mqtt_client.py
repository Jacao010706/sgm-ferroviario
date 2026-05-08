"""
Cliente MQTT assíncrono para recepção de dados de sensores IoT.
Suporta QoS 0/1/2 e reconexão automática.
"""
import asyncio
import json
import structlog
from typing import Callable
import aiomqtt
from app.core.config import settings

log = structlog.get_logger(__name__)


class MQTTClient:
    def __init__(self):
        self.broker = settings.MQTT_BROKER
        self.port = settings.MQTT_PORT
        self.username = settings.MQTT_USERNAME or None
        self.password = settings.MQTT_PASSWORD or None
        self._topic_handlers: dict[str, list[Callable]] = {}
        self._running = False

    def subscribe(self, topic: str, handler: Callable):
        """Registra handler para um tópico (suporta wildcards + e #)"""
        self._topic_handlers.setdefault(topic, []).append(handler)

    def _match_topic(self, pattern: str, topic: str) -> bool:
        """Match MQTT wildcard"""
        parts = topic.split("/")
        pats = pattern.split("/")
        if pats[-1] == "#":
            return parts[:len(pats)-1] == pats[:-1]
        if len(parts) != len(pats):
            return False
        return all(p == "+" or p == t for p, t in zip(pats, parts))

    async def run_forever(self):
        self._running = True
        topics = list(self._topic_handlers.keys())
        while self._running:
            try:
                async with aiomqtt.Client(
                    hostname=self.broker,
                    port=self.port,
                    username=self.username,
                    password=self.password,
                    keepalive=60,
                ) as client:
                    log.info("MQTT conectado", broker=self.broker, topics=topics)
                    for topic in topics:
                        await client.subscribe(topic, qos=1)
                    async for message in client.messages:
                        await self._dispatch(str(message.topic), message.payload)
            except aiomqtt.MqttError as e:
                log.error("MQTT desconectado, reconectando em 5s", error=str(e))
                await asyncio.sleep(5)

    async def _dispatch(self, topic: str, payload: bytes):
        try:
            data = json.loads(payload.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            data = {"raw": payload.decode(errors="replace")}

        for pattern, handlers in self._topic_handlers.items():
            if self._match_topic(pattern, topic):
                for handler in handlers:
                    try:
                        await handler(topic, data)
                    except Exception as e:
                        log.error("Erro em handler MQTT", topic=topic, error=str(e))

    def stop(self):
        self._running = False

from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SGM Ferroviário"
    VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "production", "testing"] = "development"
    SECRET_KEY: str = "change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Banco de dados
    DATABASE_URL: str = "postgresql+asyncpg://sgm:sgm_secret@localhost:5432/sgm_ferroviario"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # RabbitMQ
    RABBITMQ_URL: str = "amqp://sgm:sgm_secret@localhost:5672/"

    # MQTT / IoT
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""

    # SCADA - OPC-UA
    OPCUA_SERVER_URL: str = "opc.tcp://localhost:4840/"
    OPCUA_NAMESPACE: str = "urn:sgm:scada"

    # SCADA - Modbus
    MODBUS_HOST: str = "localhost"
    MODBUS_PORT: int = 502

    # ERP
    ERP_TYPE: Literal["sap", "totvs", "oracle", "generic"] = "generic"
    SAP_BASE_URL: str = ""
    SAP_CLIENT_ID: str = ""
    SAP_CLIENT_SECRET: str = ""
    TOTVS_BASE_URL: str = ""
    TOTVS_USERNAME: str = ""
    TOTVS_PASSWORD: str = ""
    ORACLE_BASE_URL: str = ""
    ORACLE_CLIENT_ID: str = ""
    ORACLE_CLIENT_SECRET: str = ""

    # Email
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Alertas IoT (thresholds padrão)
    VOLTAGE_MIN_KV: float = 10.0
    VOLTAGE_MAX_KV: float = 15.0
    TEMP_MAX_C: float = 80.0
    VIBRATION_MAX_MM_S: float = 7.1

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.core.database import Base


class ControllerType(str, enum.Enum):
    DSE = "dse"
    STEMAC = "stemac"


class AuditCommand(str, enum.Enum):
    START = "start"
    STOP = "stop"
    MANUAL = "manual"
    AUTO = "auto"


class AuditResult(str, enum.Enum):
    TENTATIVA = "tentativa"
    SUCESSO = "sucesso"
    FALHA = "falha"


class AuditOrigin(str, enum.Enum):
    FASTAPI = "fastapi"
    FLASK_LOCAL = "flask_local"


class CommandAuditLog(Base):
    """
    Auditoria de comandos remotos enviados aos GMGs.

    Cada comando gera DUAS linhas: origem=FASTAPI/resultado=TENTATIVA quando o
    backend recebe o pedido, e origem=FLASK_LOCAL/resultado=SUCESSO|FALHA quando
    o Flask local confirma o resultado real do envio Modbus.
    """
    __tablename__ = "command_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gmg_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), index=True)
    gmg_tag: Mapped[str | None] = mapped_column(String(50))
    gmg_nome: Mapped[str] = mapped_column(String(100))
    controller_type: Mapped[ControllerType] = mapped_column(SAEnum(ControllerType))
    usuario: Mapped[str] = mapped_column(String(100), index=True)
    comando: Mapped[AuditCommand] = mapped_column(SAEnum(AuditCommand))
    registros_modbus: Mapped[dict | list | None] = mapped_column(JSON)
    resultado: Mapped[AuditResult] = mapped_column(SAEnum(AuditResult), index=True)
    mensagem_erro: Mapped[str | None] = mapped_column(Text)
    origem: Mapped[AuditOrigin] = mapped_column(SAEnum(AuditOrigin))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    gmg: Mapped["Asset"] = relationship("Asset")
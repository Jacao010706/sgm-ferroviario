from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, func
from app.database import Base


class SaeeAtivo(Base):
    __tablename__ = "saee_ativos"

    id             = Column(Integer, primary_key=True, index=True)
    seq_planilha   = Column(Integer, nullable=True)
    num_ativo      = Column(String(20), nullable=True)
    local          = Column(String(50), nullable=True)
    sublocal       = Column(String(60), nullable=True)
    sistema        = Column(String(80), nullable=True)
    nome_ativo     = Column(String(200), nullable=True)
    tag            = Column(String(50), nullable=True)
    esp_tecnica    = Column(String(200), nullable=True)
    tag_diagrama   = Column(String(50), nullable=True)
    diagrama       = Column(String(100), nullable=True)
    item_contrato  = Column(String(20), nullable=True)
    periodicidade  = Column(String(20), nullable=True)
    area           = Column(String(20), nullable=True)
    data_ult_manu  = Column(Date, nullable=True)
    proxima_manu   = Column(Date, nullable=True)
    ativo          = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class ContractedCompany(Base):
    __tablename__ = "contracted_companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    cnpj = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
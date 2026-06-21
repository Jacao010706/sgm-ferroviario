from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class CompanyPreposto(Base):
    __tablename__ = "company_prepostos"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("contracted_companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
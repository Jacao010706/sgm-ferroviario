from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.contracted_company import ContractedCompany
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/contracted-companies", tags=["contracted-companies"])

class ContractedCompanyCreate(BaseModel):
    name: str
    cnpj: Optional[str] = None

class ContractedCompanyOut(BaseModel):
    id: int
    name: str
    cnpj: Optional[str] = None
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ContractedCompanyOut])
async def list_companies(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(ContractedCompany).order_by(ContractedCompany.name))
    return result.scalars().all()

@router.post("/", response_model=ContractedCompanyOut)
async def create_company(data: ContractedCompanyCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    company = ContractedCompany(name=data.name, cnpj=data.cnpj)
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company

@router.delete("/{company_id}")
async def delete_company(company_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(ContractedCompany).where(ContractedCompany.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa nao encontrada")
    await db.delete(company)
    await db.commit()
    return {"ok": True}
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.company_preposto import CompanyPreposto
from app.api.deps import get_current_user

router = APIRouter(prefix="/company-prepostos", tags=["company-prepostos"])


class CompanyPrepostoCreate(BaseModel):
    company_id: int
    name: str


class CompanyPrepostoOut(BaseModel):
    id: int
    company_id: int
    name: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[CompanyPrepostoOut])
async def list_prepostos(
    company_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    query = select(CompanyPreposto).order_by(CompanyPreposto.name)
    if company_id is not None:
        query = query.where(CompanyPreposto.company_id == company_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=CompanyPrepostoOut)
async def create_preposto(
    data: CompanyPrepostoCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    preposto = CompanyPreposto(company_id=data.company_id, name=data.name.strip())
    db.add(preposto)
    await db.commit()
    await db.refresh(preposto)
    return preposto


@router.delete("/{preposto_id}")
async def delete_preposto(
    preposto_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(CompanyPreposto).where(CompanyPreposto.id == preposto_id))
    preposto = result.scalar_one_or_none()
    if not preposto:
        raise HTTPException(status_code=404, detail="Preposto nao encontrado")
    await db.delete(preposto)
    await db.commit()
    return {"ok": True}
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.fiscal_name import FiscalName
from app.api.deps import get_current_user

router = APIRouter(prefix="/fiscal-names", tags=["fiscal-names"])


class FiscalNameUse(BaseModel):
    name: str


class FiscalNameOut(BaseModel):
    id: int
    name: str
    times_used: int

    class Config:
        from_attributes = True


@router.get("/", response_model=List[FiscalNameOut])
async def list_fiscal_names(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(
        select(FiscalName).order_by(FiscalName.times_used.desc(), FiscalName.name)
    )
    return result.scalars().all()


@router.post("/use", response_model=FiscalNameOut)
async def register_fiscal_name_use(
    data: FiscalNameUse,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Registra o uso de um nome de fiscal. Cria se nao existir, incrementa contador se existir."""
    name = data.name.strip()
    result = await db.execute(select(FiscalName).where(FiscalName.name == name))
    fiscal = result.scalar_one_or_none()

    if fiscal:
        fiscal.times_used += 1
        fiscal.last_used_at = datetime.now(timezone.utc)
    else:
        fiscal = FiscalName(name=name)
        db.add(fiscal)

    await db.commit()
    await db.refresh(fiscal)
    return fiscal

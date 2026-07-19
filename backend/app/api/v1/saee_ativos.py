from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case
from typing import Optional
from datetime import date, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.models.saee_ativo import SaeeAtivo

router = APIRouter(prefix="/saee-ativos", tags=["saee-ativos"])

PERIODICIDADE_DIAS = {
    "MENSAL": 30, "BIMESTRAL": 61, "TRIMESTRAL": 91,
    "SEMESTRAL": 182, "ANUAL": 365, "BIENAL": 730,
}

class ManutencaoRegistro(BaseModel):
    data_realizacao: date
    observacao: Optional[str] = None

def calcular_status(proxima_manu):
    if proxima_manu is None:
        return "SEM_DATA"
    hoje = date.today()
    if proxima_manu < hoje:
        return "VENCIDO"
    if proxima_manu <= hoje + timedelta(days=30):
        return "PROXIMO"
    return "OK"

def enrich(ativo):
    d = {c.name: getattr(ativo, c.name) for c in ativo.__table__.columns}
    d["status"] = calcular_status(ativo.proxima_manu)
    return d


@router.get("")
async def listar_ativos(
    sistema: Optional[str] = Query(None),
    sublocal: Optional[str] = Query(None),
    periodicidade: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    busca: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(SaeeAtivo).where(SaeeAtivo.ativo == True)
    if sistema:        q = q.where(SaeeAtivo.sistema == sistema)
    if sublocal:       q = q.where(SaeeAtivo.sublocal == sublocal)
    if periodicidade:  q = q.where(SaeeAtivo.periodicidade == periodicidade)
    if busca:
        like = f"%{busca}%"
        q = q.where(or_(SaeeAtivo.nome_ativo.ilike(like), SaeeAtivo.tag.ilike(like), SaeeAtivo.num_ativo.ilike(like)))
    hoje = date.today()
    if status == "VENCIDO":    q = q.where(SaeeAtivo.proxima_manu < hoje)
    elif status == "PROXIMO":  q = q.where(SaeeAtivo.proxima_manu >= hoje, SaeeAtivo.proxima_manu <= hoje + timedelta(days=30))
    elif status == "OK":       q = q.where(SaeeAtivo.proxima_manu > hoje + timedelta(days=30))
    elif status == "SEM_DATA": q = q.where(SaeeAtivo.proxima_manu == None)
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()
    q = q.order_by(SaeeAtivo.proxima_manu.asc().nullslast()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"total": total, "page": page, "page_size": page_size, "total_pages": (total + page_size - 1) // page_size, "items": [enrich(a) for a in items]}


@router.get("/resumo")
async def resumo_ativos(db: AsyncSession = Depends(get_db)):
    hoje = date.today()
    em_30 = hoje + timedelta(days=30)
    r = await db.execute(select(func.count()).where(SaeeAtivo.ativo == True))
    total = r.scalar()
    r = await db.execute(select(func.count()).where(SaeeAtivo.ativo == True, SaeeAtivo.proxima_manu < hoje))
    vencidos = r.scalar()
    r = await db.execute(select(func.count()).where(SaeeAtivo.ativo == True, SaeeAtivo.proxima_manu >= hoje, SaeeAtivo.proxima_manu <= em_30))
    proximos = r.scalar()
    r = await db.execute(select(func.count()).where(SaeeAtivo.ativo == True, SaeeAtivo.proxima_manu > em_30))
    ok = r.scalar()
    r = await db.execute(select(SaeeAtivo.sistema, func.count(SaeeAtivo.id).label("total"), func.count(case((SaeeAtivo.proxima_manu < hoje, 1))).label("vencidos")).where(SaeeAtivo.ativo == True).group_by(SaeeAtivo.sistema))
    por_sistema = r.all()
    return {"total": total, "vencidos": vencidos, "proximos_30d": proximos, "ok": ok, "sem_data": total - vencidos - proximos - ok, "eficiencia_pct": round((ok / total * 100) if total else 0, 1), "por_sistema": [{"sistema": s.sistema or "Não informado", "total": s.total, "vencidos": s.vencidos} for s in por_sistema]}


@router.get("/filtros")
async def opcoes_filtros(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(SaeeAtivo.sistema).distinct().where(SaeeAtivo.sistema != None).order_by(SaeeAtivo.sistema))
    sistemas = [row[0] for row in r.all()]
    r = await db.execute(select(SaeeAtivo.sublocal).distinct().where(SaeeAtivo.sublocal != None).order_by(SaeeAtivo.sublocal))
    sublocais = [row[0] for row in r.all()]
    r = await db.execute(select(SaeeAtivo.periodicidade).distinct().where(SaeeAtivo.periodicidade != None).order_by(SaeeAtivo.periodicidade))
    periodicidades = [row[0] for row in r.all()]
    return {"sistemas": sistemas, "sublocais": sublocais, "periodicidades": periodicidades}


@router.get("/{ativo_id}")
async def detalhe_ativo(ativo_id: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(SaeeAtivo).where(SaeeAtivo.id == ativo_id))
    ativo = r.scalar_one_or_none()
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    return enrich(ativo)


@router.post("/{ativo_id}/manutencao")
async def registrar_manutencao(ativo_id: int, body: ManutencaoRegistro, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(SaeeAtivo).where(SaeeAtivo.id == ativo_id))
    ativo = r.scalar_one_or_none()
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    dias = PERIODICIDADE_DIAS.get((ativo.periodicidade or "").upper())
    if not dias:
        raise HTTPException(status_code=400, detail=f"Periodicidade '{ativo.periodicidade}' não reconhecida")
    ativo.data_ult_manu = body.data_realizacao
    ativo.proxima_manu  = body.data_realizacao + timedelta(days=dias)
    await db.commit()
    await db.refresh(ativo)
    return {"mensagem": "Manutenção registrada", "proxima_manu": str(ativo.proxima_manu), "status": calcular_status(ativo.proxima_manu)}
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case
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
    return d@router.get("")
def listar_ativos(
    sistema: Optional[str] = Query(None),
    sublocal: Optional[str] = Query(None),
    periodicidade: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    busca: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(SaeeAtivo).filter(SaeeAtivo.ativo == True)
    if sistema:       q = q.filter(SaeeAtivo.sistema == sistema)
    if sublocal:      q = q.filter(SaeeAtivo.sublocal == sublocal)
    if periodicidade: q = q.filter(SaeeAtivo.periodicidade == periodicidade)
    if busca:
        like = f"%{busca}%"
        q = q.filter(or_(SaeeAtivo.nome_ativo.ilike(like), SaeeAtivo.tag.ilike(like), SaeeAtivo.num_ativo.ilike(like)))
    hoje = date.today()
    if status == "VENCIDO":   q = q.filter(SaeeAtivo.proxima_manu < hoje)
    elif status == "PROXIMO": q = q.filter(SaeeAtivo.proxima_manu >= hoje, SaeeAtivo.proxima_manu <= hoje + timedelta(days=30))
    elif status == "OK":      q = q.filter(SaeeAtivo.proxima_manu > hoje + timedelta(days=30))
    elif status == "SEM_DATA": q = q.filter(SaeeAtivo.proxima_manu == None)
    q = q.order_by(SaeeAtivo.proxima_manu.asc().nullslast())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "total_pages": (total + page_size - 1) // page_size, "items": [enrich(a) for a in items]}


@router.get("/resumo")
def resumo_ativos(db: Session = Depends(get_db)):
    hoje = date.today()
    em_30 = hoje + timedelta(days=30)
    total    = db.query(func.count(SaeeAtivo.id)).filter(SaeeAtivo.ativo == True).scalar()
    vencidos = db.query(func.count(SaeeAtivo.id)).filter(SaeeAtivo.ativo == True, SaeeAtivo.proxima_manu < hoje).scalar()
    proximos = db.query(func.count(SaeeAtivo.id)).filter(SaeeAtivo.ativo == True, SaeeAtivo.proxima_manu >= hoje, SaeeAtivo.proxima_manu <= em_30).scalar()
    ok       = db.query(func.count(SaeeAtivo.id)).filter(SaeeAtivo.ativo == True, SaeeAtivo.proxima_manu > em_30).scalar()
    por_sistema = db.query(SaeeAtivo.sistema, func.count(SaeeAtivo.id).label("total"), func.count(case((SaeeAtivo.proxima_manu < hoje, 1))).label("vencidos")).filter(SaeeAtivo.ativo == True).group_by(SaeeAtivo.sistema).all()
    return {"total": total, "vencidos": vencidos, "proximos_30d": proximos, "ok": ok, "sem_data": total - vencidos - proximos - ok, "eficiencia_pct": round((ok / total * 100) if total else 0, 1), "por_sistema": [{"sistema": r.sistema or "Não informado", "total": r.total, "vencidos": r.vencidos} for r in por_sistema]}


@router.get("/filtros")
def opcoes_filtros(db: Session = Depends(get_db)):
    sistemas      = [r[0] for r in db.query(SaeeAtivo.sistema).distinct().filter(SaeeAtivo.sistema != None).order_by(SaeeAtivo.sistema).all()]
    sublocais     = [r[0] for r in db.query(SaeeAtivo.sublocal).distinct().filter(SaeeAtivo.sublocal != None).order_by(SaeeAtivo.sublocal).all()]
    periodicidades = [r[0] for r in db.query(SaeeAtivo.periodicidade).distinct().filter(SaeeAtivo.periodicidade != None).order_by(SaeeAtivo.periodicidade).all()]
    return {"sistemas": sistemas, "sublocais": sublocais, "periodicidades": periodicidades}


@router.get("/{ativo_id}")
def detalhe_ativo(ativo_id: int, db: Session = Depends(get_db)):
    ativo = db.query(SaeeAtivo).filter(SaeeAtivo.id == ativo_id).first()
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    return enrich(ativo)


@router.post("/{ativo_id}/manutencao")
def registrar_manutencao(ativo_id: int, body: ManutencaoRegistro, db: Session = Depends(get_db)):
    ativo = db.query(SaeeAtivo).filter(SaeeAtivo.id == ativo_id).first()
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    dias = PERIODICIDADE_DIAS.get((ativo.periodicidade or "").upper())
    if not dias:
        raise HTTPException(status_code=400, detail=f"Periodicidade '{ativo.periodicidade}' não reconhecida")
    ativo.data_ult_manu = body.data_realizacao
    ativo.proxima_manu  = body.data_realizacao + timedelta(days=dias)
    db.commit()
    db.refresh(ativo)
    return {"mensagem": "Manutenção registrada", "proxima_manu": str(ativo.proxima_manu), "status": calcular_status(ativo.proxima_manu)}
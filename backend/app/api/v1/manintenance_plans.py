from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from dateutil.relativedelta import relativedelta
import enum

from app.core.database import Base, get_db

router = APIRouter(prefix="/planos-preventivos", tags=["Planos Preventivos"])

MESES_POR_PERIODICIDADE = {
    "MENSAL": 1, "BIMESTRAL": 2, "TRIMESTRAL": 3,
    "SEMESTRAL": 6, "ANUAL": 12, "BIENAL": 24,
}

class PlanoPreventivo(Base):
    __tablename__ = "planos_preventivos"
    id               = Column(Integer, primary_key=True, index=True)
    ativo_id         = Column(Integer, ForeignKey("saee_ativos.id"), nullable=False)
    tipo_servico     = Column(String(120), nullable=False)
    periodicidade    = Column(String(20), nullable=False, default="SEMESTRAL")
    data_programada  = Column(Date, nullable=False)
    data_realizada   = Column(Date, nullable=True)
    responsavel      = Column(String(100), nullable=True)
    status           = Column(String(20), nullable=False, default="PROGRAMADO")
    observacoes      = Column(Text, nullable=True)
    gerar_proximo    = Column(Integer, nullable=False, default=1)
    ativo = relationship("SAEEAtivo", backref="planos")

class PlanoCreate(BaseModel):
    ativo_id        : int
    tipo_servico    : str
    periodicidade   : str = "SEMESTRAL"
    data_programada : date
    data_realizada  : Optional[date] = None
    responsavel     : Optional[str] = None
    status          : str = "PROGRAMADO"
    observacoes     : Optional[str] = None
    gerar_proximo   : bool = True

class PlanoUpdate(BaseModel):
    tipo_servico    : Optional[str] = None
    periodicidade   : Optional[str] = None
    data_programada : Optional[date] = None
    data_realizada  : Optional[date] = None
    responsavel     : Optional[str] = None
    status          : Optional[str] = None
    observacoes     : Optional[str] = None
    gerar_proximo   : Optional[bool] = None

class PlanoConcluir(BaseModel):
    data_realizada : date
    responsavel    : Optional[str] = None
    observacoes    : Optional[str] = None

def calcular_proxima(data_base: date, periodicidade: str) -> date:
    meses = MESES_POR_PERIODICIDADE.get(periodicidade, 6)
    return data_base + relativedelta(months=meses)

def enriquecer(plano: PlanoPreventivo) -> dict:
    d = {c.name: getattr(plano, c.name) for c in plano.__table__.columns}
    d["ativo_tag"]      = plano.ativo.tag if plano.ativo else None
    d["ativo_sublocal"] = plano.ativo.sublocal if plano.ativo else None
    if plano.data_programada and plano.status == "PROGRAMADO":
        d["dias_para_data"] = (plano.data_programada - date.today()).days
    else:
        d["dias_para_data"] = None
    return d

@router.get("/", response_model=List[dict])
def listar(ativo_id: Optional[int] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(PlanoPreventivo)
    if ativo_id: q = q.filter(PlanoPreventivo.ativo_id == ativo_id)
    if status:   q = q.filter(PlanoPreventivo.status == status)
    planos = q.order_by(PlanoPreventivo.data_programada).all()
    for p in planos:
        if p.status == "PROGRAMADO" and p.data_programada < date.today():
            p.status = "ATRASADO"
    db.commit()
    return [enriquecer(p) for p in planos]

@router.get("/{plano_id}", response_model=dict)
def obter(plano_id: int, db: Session = Depends(get_db)):
    p = db.query(PlanoPreventivo).filter(PlanoPreventivo.id == plano_id).first()
    if not p: raise HTTPException(status_code=404, detail="Plano não encontrado")
    return enriquecer(p)

@router.post("/", response_model=dict, status_code=201)
def criar(body: PlanoCreate, db: Session = Depends(get_db)):
    p = PlanoPreventivo(**body.dict())
    db.add(p); db.commit(); db.refresh(p)
    return enriquecer(p)

@router.put("/{plano_id}", response_model=dict)
def atualizar(plano_id: int, body: PlanoUpdate, db: Session = Depends(get_db)):
    p = db.query(PlanoPreventivo).filter(PlanoPreventivo.id == plano_id).first()
    if not p: raise HTTPException(status_code=404, detail="Plano não encontrado")
    for k, v in body.dict(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return enriquecer(p)

@router.post("/{plano_id}/concluir", response_model=dict)
def concluir(plano_id: int, body: PlanoConcluir, db: Session = Depends(get_db)):
    p = db.query(PlanoPreventivo).filter(PlanoPreventivo.id == plano_id).first()
    if not p: raise HTTPException(status_code=404, detail="Plano não encontrado")
    p.status = "CONCLUIDO"
    p.data_realizada = body.data_realizada
    if body.responsavel: p.responsavel = body.responsavel
    if body.observacoes: p.observacoes = body.observacoes
    if p.ativo: p.ativo.data_ult_manu = body.data_realizada
    proximo = None
    if p.gerar_proximo:
        proxima_data = calcular_proxima(body.data_realizada, p.periodicidade)
        proximo = PlanoPreventivo(
            ativo_id=p.ativo_id, tipo_servico=p.tipo_servico,
            periodicidade=p.periodicidade, data_programada=proxima_data,
            responsavel=p.responsavel, status="PROGRAMADO", gerar_proximo=p.gerar_proximo,
        )
        db.add(proximo)
        if p.ativo: p.ativo.proxima_manu = str(proxima_data)
    db.commit(); db.refresh(p)
    return {"plano_concluido": enriquecer(p), "proximo_gerado": enriquecer(proximo) if proximo else None}

@router.delete("/{plano_id}", status_code=204)
def excluir(plano_id: int, db: Session = Depends(get_db)):
    p = db.query(PlanoPreventivo).filter(PlanoPreventivo.id == plano_id).first()
    if not p: raise HTTPException(status_code=404, detail="Plano não encontrado")
    db.delete(p); db.commit()
    return None

@router.get("/ativo/{ativo_id}/historico", response_model=List[dict])
def historico_ativo(ativo_id: int, db: Session = Depends(get_db)):
    planos = db.query(PlanoPreventivo)\
        .filter(PlanoPreventivo.ativo_id == ativo_id)\
        .order_by(PlanoPreventivo.data_programada.desc()).all()
    return [enriquecer(p) for p in planos]
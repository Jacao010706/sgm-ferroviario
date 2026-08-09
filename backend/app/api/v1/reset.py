from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/admin/reset", tags=["Admin Reset"])

@router.delete("/tudo")
async def reset_tudo(confirmar: str, db: AsyncSession = Depends(get_db)):
    if confirmar != "CONFIRMO_APAGAR_TUDO":
        raise HTTPException(status_code=400, detail="Use: confirmar=CONFIRMO_APAGAR_TUDO")
    for tabela in ["planos_preventivos","inspecoes","work_orders","alerts","saee_ativos"]:
        try:
            await db.execute(text(f"DELETE FROM {tabela}"))
        except Exception:
            pass
    await db.commit()
    return {"status":"ok","mensagem":"Dados apagados com sucesso."}

@router.delete("/saee-ativos")
async def reset_ativos(confirmar: str, db: AsyncSession = Depends(get_db)):
    if confirmar != "CONFIRMO_APAGAR_TUDO":
        raise HTTPException(status_code=400, detail="Parametro invalido")
    for tabela in ["planos_preventivos","inspecoes","alerts"]:
        try:
            await db.execute(text(f"DELETE FROM {tabela}"))
        except Exception:
            pass
    result = await db.execute(text("DELETE FROM saee_ativos"))
    await db.commit()
    return {"status":"ok","mensagem":f"{result.rowcount} GGDs apagados."}
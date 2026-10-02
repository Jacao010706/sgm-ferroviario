from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.api.deps import require_admin

# Rotas que apagam dados em massa.
#
# Ate 21/09/2026 nenhuma das duas exigia login. A unica barreira era o
# parametro confirmar=CONFIRMO_APAGAR_TUDO -- e quem errava o parametro
# recebia essa mesma frase de volta na mensagem de erro. Uma chamada anonima
# apagava ordens de servico, alertas, planos preventivos, inspecoes e o
# cadastro dos GGDs do banco de producao.
#
# Agora exigem administrador autenticado. O parametro de confirmacao continua
# como segunda barreira contra clique acidental, mas a mensagem de erro nao
# revela mais o valor esperado.

router = APIRouter(prefix="/admin/reset", tags=["Admin Reset"])

_CONFIRMACAO = "CONFIRMO_APAGAR_TUDO"


def _conferir(confirmar: str) -> None:
    if confirmar != _CONFIRMACAO:
        raise HTTPException(status_code=400, detail="Confirmacao invalida.")


@router.delete("/tudo")
async def reset_tudo(
    confirmar: str,
    db: AsyncSession = Depends(get_db),
    _admin = Depends(require_admin),
):
    _conferir(confirmar)
    for tabela in ["planos_preventivos", "inspecoes", "work_orders", "alerts", "saee_ativos"]:
        try:
            await db.execute(text(f"DELETE FROM {tabela}"))
        except Exception:
            pass
    await db.commit()
    return {"status": "ok", "mensagem": "Dados apagados com sucesso."}


@router.delete("/saee-ativos")
async def reset_ativos(
    confirmar: str,
    db: AsyncSession = Depends(get_db),
    _admin = Depends(require_admin),
):
    _conferir(confirmar)
    for tabela in ["planos_preventivos", "inspecoes", "alerts"]:
        try:
            await db.execute(text(f"DELETE FROM {tabela}"))
        except Exception:
            pass
    result = await db.execute(text("DELETE FROM saee_ativos"))
    await db.commit()
    return {"status": "ok", "mensagem": f"{result.rowcount} GGDs apagados."}

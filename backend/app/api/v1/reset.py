from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/admin/reset", tags=["Admin Reset"])

@router.delete("/tudo", summary="Apaga TODOS os dados do sistema")
async def reset_tudo(confirmar: str, db: Session = Depends(get_db)):
    """
    Apaga todos os dados do sistema.
    Requer o parâmetro confirmar=CONFIRMO_APAGAR_TUDO para evitar acidente.
    """
    if confirmar != "CONFIRMO_APAGAR_TUDO":
        raise HTTPException(status_code=400, detail="Parâmetro de confirmação inválido. Use: confirmar=CONFIRMO_APAGAR_TUDO")

    tabelas = [
        "planos_preventivos",
        "inspecoes",
        "ordens_servico",
        "alertas",
        "historico",
        "saee_ativos",
    ]

    resultados = {}
    for tabela in tabelas:
        try:
            result = db.execute(text(f"DELETE FROM {tabela}"))
            resultados[tabela] = f"{result.rowcount} registros apagados"
        except Exception as e:
            resultados[tabela] = f"Tabela não encontrada ou erro: {str(e)}"

    # Reseta sequences (IDs voltam para 1)
    for tabela in tabelas:
        try:
            db.execute(text(f"ALTER SEQUENCE {tabela}_id_seq RESTART WITH 1"))
        except Exception:
            pass

    db.commit()

    return {
        "status": "ok",
        "mensagem": "Todos os dados foram apagados. Sistema pronto para dados reais.",
        "detalhes": resultados
    }


@router.delete("/saee-ativos", summary="Apaga apenas os GGDs")
async def reset_ativos(confirmar: str, db: Session = Depends(get_db)):
    """Apaga apenas os GGDs/saee_ativos."""
    if confirmar != "CONFIRMO_APAGAR_TUDO":
        raise HTTPException(status_code=400, detail="Parâmetro inválido")

    tabelas_dependentes = ["planos_preventivos", "inspecoes", "alertas"]
    for t in tabelas_dependentes:
        try:
            db.execute(text(f"DELETE FROM {t}"))
        except Exception:
            pass

    result = db.execute(text("DELETE FROM saee_ativos"))
    try:
        db.execute(text("ALTER SEQUENCE saee_ativos_id_seq RESTART WITH 1"))
    except Exception:
        pass

    db.commit()
    return {
        "status": "ok",
        "mensagem": f"{result.rowcount} GGDs apagados. Cadastre os dados reais.",
    }
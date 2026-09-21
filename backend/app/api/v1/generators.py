from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal
import logging
import httpx

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from datetime import datetime

log = logging.getLogger(__name__)

router = APIRouter(prefix="/generators", tags=["generators"])

class ComandoRequest(BaseModel):
    action: Literal["start", "stop", "auto", "manual"]

class ComandoResponse(BaseModel):
    success: bool
    message: str
    asset_id: str
    action: str
    # "ok" quando a auditoria gravou; caso contrario, o motivo da falha.
    # O comando nao depende disso -- acionar o gerador tem prioridade --,
    # mas quem chamou fica sabendo que o acionamento nao deixou rastro.
    auditoria: str = "ok"

# Mapeamento asset_id -> (tag, tipo, ip_coletor)
# O coletor roda na rede interna da Trensurb em 10.80.0.100:8888
COLETOR_URL = None
COLETOR_SECRET = "sgm-trensurb-2026"

GERADORES_CONFIG = {
    "09840a92-13e2-4ac5-9988-35cbc1ed3be9": ("GMG-MERCADO",       "dse"),
    "b5d38303-cd04-4b6f-aae5-717e70acdfbe": ("GMG-RODOVIARIA",    "dse"),
    "a620efdf-6826-4bf9-b724-c17f36dd9e65": ("GMG-SAOPEDRO",      "dse"),
    "1fe629e4-1432-45df-8eac-e64e682ec2a5": ("GMG-FARRAPOS",      "dse"),
    "00189b70-fa1b-4127-9270-2f147d0c95e8": ("GMG-AEROPORTO",     "stemac"),
    "ead6e2bf-5718-4245-b45e-9e4686541163": ("GMG-ANCHIETA",      "stemac"),
    "9701e9d5-2965-4558-9971-622453941e9f": ("GMG-NITEROI",       "stemac"),
    "0630a8c5-d9d2-44b5-b3ef-51cd9f6bec4d": ("GMG-FATIMA",        "stemac"),
    "ba830f68-2f8d-4f9c-96be-2d305e69d924": ("GMG-CANOAS",        "dse"),
    "462ad264-edab-46fa-ae6a-d9556a02281e": ("GMG-MATHIASVELHO",  "stemac"),
    "f29b82f4-ad67-4306-a936-d2a0969d1761": ("GMG-SAOLUIS",       "stemac"),
    "1a5ecc9e-29db-489f-a06d-5e300522238f": ("GMG-PETROBRAS",     "stemac"),
    "d945d875-e52d-4a45-9b1d-24a7737a8247": ("GMG-ESTEIO",        "dse"),
    "369ec2d9-533c-490d-aab1-b4469319c66c": ("GMG-LUIZPASTEUR",   "dse"),
    "ba0ac30b-1445-417a-b2df-af5c11f7a23f": ("GMG-SAPUCAIA",      "stemac"),
    "edda6366-494b-4ef9-a0de-8b375e6a9d03": ("GMG-UNISINOS",      "dse"),
    "05943bd6-9355-4337-8ce4-d9c79d3a5e79": ("GMG-SAOLEOPOLDO",   "stemac"),
    "fe93f2af-4bb5-4376-b2c0-3e2ee7d4fe49": ("GMG-RIOSINOS",      "dse"),
    "2cba7fec-b47d-4c1b-8697-6a6e674f16d8": ("GMG-SANTOAFONSO",   "dse"),
    "43c2f463-eef2-467f-81af-73b7a336fa26": ("GMG-INDUSTRIAL",    "dse"),
    "c5e8d594-318e-4de4-94d6-4417c09e34f7": ("GMG-FENAC",         "dse"),
    "7af45b8b-ffbc-4c50-96b5-97c522782ef4": ("GMG-NOVOHAMBURGO",  "dse"),
    "c679762c-fc6a-4316-a6bd-f2437fc90dd7": ("GMG-SUBESTACAO2",   "stemac"),
    "37e190ef-601d-4c4a-a6ff-cf43d3b66b92": ("GMG-BACIA1",        "dse"),
    "1ff45722-6633-4e4a-8ca3-5f91eef43000": ("GMG-BACIA2",        "dse"),
}

# Quem pode comandar um gerador pelo painel: operadores do CCO, tecnicos,
# engenheiros, supervisao/chefia e administradores. VIEWER fica de fora --
# ve o painel, nao opera.
CARGOS_AUTORIZADOS = {
    "OPERATOR", "TECHNICIAN", "ENGINEER", "MANAGER", "ADMIN",
    "operator", "technician", "engineer", "manager", "admin",
}


async def _auditar(db, asset_id, tag, tipo, usuario, action, resultado, mensagem_erro=None,
                   registros=None, origem="fastapi") -> str | None:
    """
    Grava uma linha de auditoria do comando remoto.

    Retorna None quando gravou, ou uma descricao curta da falha.

    IMPORTANTE: todos os parametros devem ser valores primitivos ja extraidos.
    db.commit() expira os objetos da sessao (inclusive current_user), e acessar
    um atributo depois disso dispara lazy load -> MissingGreenlet.

    Nunca propaga excecao: acionar o gerador tem prioridade sobre registrar.
    Mas a falha deixou de ser silenciosa. Ela volta ao chamador, que a devolve
    no corpo da resposta: uma auditoria que falha calada e pior do que nao ter
    auditoria nenhuma, porque passa a impressao de existir registro de quem
    acionou o que -- e e justamente esse registro que se procura depois de um
    incidente.
    """
    try:
        from app.models.command_audit_log import (
            CommandAuditLog, AuditCommand, AuditResult, AuditOrigin, ControllerType,
        )
        db.add(CommandAuditLog(
            gmg_id=asset_id,
            gmg_tag=tag,
            gmg_nome=tag,
            controller_type=ControllerType(tipo),
            usuario=usuario,
            comando=AuditCommand(action),
            resultado=AuditResult(resultado),
            mensagem_erro=mensagem_erro,
            registros_modbus=registros,
            origem=AuditOrigin(origem),
        ))
        await db.commit()
        return None
    except Exception as e:
        log.exception("Falha ao gravar auditoria (comando segue normalmente)")
        try:
            await db.rollback()
        except Exception:
            pass
        return f"{type(e).__name__}: {str(e)[:200]}"

@router.get("/audit-log")
async def listar_auditoria(
    gmg_id: str | None = None,
    gmg_tag: str | None = None,
    usuario: str | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Historico de comandos remotos enviados aos GMGs.

    Cada comando gera ate 3 registros: TENTATIVA e SUCESSO/FALHA pela origem
    FASTAPI, e a confirmacao FLASK_LOCAL com os registros Modbus escritos.

    Os timestamps sao gravados em UTC.
    """
    if current_user.role not in CARGOS_AUTORIZADOS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas tecnicos, engenheiros e administradores podem consultar a auditoria.",
        )

    from sqlalchemy import select as _select
    from app.models.command_audit_log import CommandAuditLog

    q = _select(CommandAuditLog)
    if gmg_id:
        q = q.where(CommandAuditLog.gmg_id == gmg_id)
    if gmg_tag:
        q = q.where(CommandAuditLog.gmg_tag == gmg_tag)
    if usuario:
        q = q.where(CommandAuditLog.usuario.ilike(f"%{usuario}%"))
    if data_inicio:
        q = q.where(CommandAuditLog.created_at >= data_inicio)
    if data_fim:
        q = q.where(CommandAuditLog.created_at <= data_fim)

    q = q.order_by(CommandAuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.delete("/audit-log")
async def limpar_auditoria(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Remove todo o historico de auditoria de comandos remotos.

    Acao irreversivel — restrita a administradores.
    """
    if (current_user.role or "").upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem limpar o historico de auditoria.",
        )

    from sqlalchemy import delete as _delete
    from app.models.command_audit_log import CommandAuditLog

    result = await db.execute(_delete(CommandAuditLog))
    await db.commit()

    log.warning(
        "Historico de auditoria LIMPO por %s (%s registros removidos)",
        current_user.email,
        result.rowcount,
    )

    return {
        "deleted": result.rowcount,
        "mensagem": f"Historico de auditoria limpo. {result.rowcount} registro(s) removido(s).",
    }


@router.get("/audit-log/diagnostico")
async def diagnosticar_auditoria(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Explica por que a auditoria de comandos nao esta gravando.

    A gravacao engole excecoes de proposito, entao a falha nao aparece em
    lugar nenhum a nao ser no log do servidor. Este endpoint responde
    direto, verificando as tres causas possiveis:

    1. a tabela command_audit_log nao existe (o projeto nao tem Alembic, ela
       so existe se alguem rodou create_all depois que o modelo entrou);
    2. os rotulos dos tipos enum no PostgreSQL divergem do que o SQLAlchemy
       grava -- ele persiste o NOME do membro, em maiusculo;
    3. a chave estrangeira nao e satisfeita: gmg_id referencia assets.id, mas
       o endpoint de comando valida o asset_id apenas contra o dicionario
       GERADORES_CONFIG, chumbado no Python e nunca conferido contra o banco.
       Um UUID que exista no dicionario e nao na tabela faz o comando passar
       e so a auditoria quebrar -- exatamente o sintoma observado.
    """
    if current_user.role not in CARGOS_AUTORIZADOS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas tecnicos, engenheiros e administradores podem consultar a auditoria.",
        )

    from sqlalchemy import text as _text

    diag: dict = {}

    async def _consultar(rotulo: str, sql: str):
        """Executa e, em caso de erro, registra o motivo e limpa a sessao.

        Sem o rollback, a primeira falha aborta a transacao e todas as
        consultas seguintes falhariam por tabela, escondendo o diagnostico.
        """
        try:
            return await db.execute(_text(sql))
        except Exception as e:
            diag[f"{rotulo}_erro"] = f"{type(e).__name__}: {str(e)[:200]}"
            try:
                await db.rollback()
            except Exception:
                pass
            return None

    r = await _consultar("tabela", "SELECT to_regclass('public.command_audit_log')")
    existe = bool(r and r.scalar())
    diag["1_tabela_existe"] = existe

    if existe:
        r = await _consultar("linhas", "SELECT COUNT(*) FROM command_audit_log")
        diag["1_linhas_gravadas"] = r.scalar() if r else None

        r = await _consultar("enums", """
            SELECT t.typname,
                   string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
              FROM pg_type t
              JOIN pg_enum e ON e.enumtypid = t.oid
             WHERE t.typname IN ('controllertype','auditcommand',
                                 'auditresult','auditorigin')
             GROUP BY t.typname
        """)
        diag["2_enums_no_banco"] = {linha[0]: linha[1] for linha in r.all()} if r else None
        diag["2_enums_esperados"] = {
            "controllertype": "DSE,STEMAC",
            "auditcommand": "START,STOP,MANUAL,AUTO",
            "auditresult": "TENTATIVA,SUCESSO,FALHA",
            "auditorigin": "FASTAPI,FLASK_LOCAL",
        }

    # Hipotese 3: comparacao feita em Python, e nao com "id = ANY(:ids)",
    # porque a ligacao de array varia conforme o driver.
    r = await _consultar("assets", "SELECT id::text FROM assets")
    if r:
        no_banco = {linha[0] for linha in r.all()}
        ausentes = [
            {"tag": cfg[0], "asset_id": uid}
            for uid, cfg in GERADORES_CONFIG.items()
            if uid not in no_banco
        ]
        diag["3_geradores_no_dicionario"] = len(GERADORES_CONFIG)
        diag["3_ausentes_na_tabela_assets"] = ausentes
        diag["3_veredito"] = (
            "chave estrangeira OK para todos"
            if not ausentes
            else f"{len(ausentes)} gerador(es) comandavel(is) sem linha em assets: "
                 "a auditoria desses sempre falha"
        )

    return diag


@router.post("/{asset_id}/command", response_model=ComandoResponse)
async def comando_gerador(
    asset_id: str,
    body: ComandoRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if current_user.role not in CARGOS_AUTORIZADOS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas tecnicos, engenheiros e administradores podem enviar comandos.")

    config = GERADORES_CONFIG.get(asset_id)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
            detail="Gerador sem configuracao registrada.")

    tag, tipo = config

    log.info(f"Comando '{body.action}' por {current_user.email} -> {tag} [{tipo}]")
    log.info(f"current_user.role={current_user.role} CARGOS={CARGOS_AUTORIZADOS}")

    # Extrai antes do primeiro commit: apos o commit a sessao expira os
    # objetos e acessar current_user.email dispararia lazy load.
    _usuario = current_user.email
    _acao = body.action

    # Falhas de auditoria nao interrompem o comando, mas sao acumuladas para
    # voltar na resposta -- ver o docstring de _auditar.
    _falhas_auditoria: list[str] = []

    def _anotar(erro: str | None) -> None:
        if erro:
            _falhas_auditoria.append(erro)

    _anotar(await _auditar(db, asset_id, tag, tipo, _usuario, _acao, "tentativa"))

    from app.core.coletor_state import _coletor_url
    import redis.asyncio as _redis
    from app.core.config import settings as _settings
    coletor_url = _coletor_url.get("url")
    if not coletor_url:
        try:
            _r = _redis.from_url(_settings.REDIS_URL)
            _v = await _r.get("sgm:coletor_url")
            await _r.aclose()
            if _v:
                coletor_url = _v.decode() if isinstance(_v, bytes) else _v
                _coletor_url["url"] = coletor_url
        except Exception:
            pass
    if not coletor_url:
        await _auditar(db, asset_id, tag, tipo, _usuario, _acao,
                       "falha", "Coletor offline (URL nao registrada)")
        raise HTTPException(status_code=503, detail="Coletor offline. Reinicie o coletor_modbus.py na maquina da Trensurb para reconectar automaticamente.")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(coletor_url + "/command", json={
                "secret": COLETOR_SECRET,
                "tag": tag,
                "action": body.action,
            })

            # Log defensivo: registra SEMPRE o que o coletor devolveu
            log.info(f"Coletor respondeu status={r.status_code} body={r.text[:500]!r}")

            if r.status_code == 200:
                _anotar(await _auditar(db, asset_id, tag, tipo, _usuario, _acao, "sucesso"))

                # Confirmacao do lado do coletor, com os registros Modbus
                # efetivamente escritos no controlador.
                _registros = None
                try:
                    _corpo = r.json()
                    if isinstance(_corpo, dict):
                        _registros = _corpo.get("registros_modbus")
                except Exception:
                    pass
                if _registros:
                    _anotar(await _auditar(db, asset_id, tag, tipo, _usuario, _acao, "sucesso",
                                           registros=_registros, origem="flask_local"))

                if _falhas_auditoria:
                    log.error(
                        "Comando '%s' em %s executado SEM registro de auditoria: %s",
                        _acao, tag, " | ".join(_falhas_auditoria),
                    )

                return ComandoResponse(
                    success=True,
                    message=f"Comando '{body.action}' enviado para {tag}.",
                    asset_id=asset_id,
                    action=body.action,
                    auditoria=("ok" if not _falhas_auditoria
                               else "NAO GRAVADA: " + " | ".join(_falhas_auditoria)[:400]),
                )

            # Erro do coletor: tenta extrair JSON, mas nao quebra se nao for JSON
            detail = "Erro no coletor"
            try:
                payload = r.json()
                if isinstance(payload, dict):
                    detail = payload.get("error") or payload.get("detail") or detail
            except Exception:
                if r.text:
                    detail = f"Coletor retornou {r.status_code}: {r.text[:200]}"
                else:
                    detail = f"Coletor retornou {r.status_code} sem corpo"

            await _auditar(db, asset_id, tag, tipo, _usuario, _acao, "falha", detail)
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    except HTTPException:
        raise
    except httpx.ConnectError:
        await _auditar(db, asset_id, tag, tipo, _usuario, _acao,
                       "falha", "Coletor inacessivel (ConnectError)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Coletor Modbus offline ou inacessivel. Verifique se o servico esta rodando na rede da Trensurb.",
        )
    except httpx.TimeoutException:
        await _auditar(db, asset_id, tag, tipo, _usuario, _acao,
                       "falha", "Timeout ao conectar ao coletor")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timeout ao conectar ao coletor Modbus.",
        )
    except Exception as e:
        log.exception(f"Erro inesperado no comando para {tag}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao processar resposta do coletor: {type(e).__name__}: {str(e)[:150]}",
        )

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal
import logging
import httpx

from app.core.database import get_db
from app.api.v1.auth import get_current_user

log = logging.getLogger(__name__)

router = APIRouter(prefix="/generators", tags=["generators"])

class ComandoRequest(BaseModel):
    action: Literal["start", "stop", "auto", "manual"]

class ComandoResponse(BaseModel):
    success: bool
    message: str
    asset_id: str
    action: str

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

CARGOS_AUTORIZADOS = {"TECHNICIAN", "ENGINEER", "ADMIN", "technician", "engineer", "admin"}


async def _auditar(db, asset_id, tag, tipo, usuario, action, resultado, mensagem_erro=None,
                   registros=None, origem="fastapi"):
    """
    Grava uma linha de auditoria do comando remoto.

    IMPORTANTE: todos os parametros devem ser valores primitivos ja extraidos.
    db.commit() expira os objetos da sessao (inclusive current_user), e acessar
    um atributo depois disso dispara lazy load -> MissingGreenlet.

    Nunca propaga excecao: acionar o gerador tem prioridade sobre registrar.
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
    except Exception:
        log.exception("Falha ao gravar auditoria (comando segue normalmente)")
        try:
            await db.rollback()
        except Exception:
            pass

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

    await _auditar(db, asset_id, tag, tipo, _usuario, _acao, "tentativa")

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
                await _auditar(db, asset_id, tag, tipo, _usuario, _acao, "sucesso")

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
                    await _auditar(db, asset_id, tag, tipo, _usuario, _acao, "sucesso",
                                   registros=_registros, origem="flask_local")

                return ComandoResponse(
                    success=True,
                    message=f"Comando '{body.action}' enviado para {tag}.",
                    asset_id=asset_id,
                    action=body.action,
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

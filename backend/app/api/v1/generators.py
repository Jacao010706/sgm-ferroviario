from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal
import logging
import httpx

from app.core.database import get_db
from app.api.v1.auth import get_current_user

log = logging.getLogger(__name__)

router = APIRouter(prefix="/generators", tags=["generators"])

class ComandoRequest(BaseModel):
    action: Literal["start", "stop", "auto"]

class ComandoResponse(BaseModel):
    success: bool
    message: str
    asset_id: str
    action: str

# Mapeamento asset_id -> (tag, tipo, ip_coletor)
# O coletor roda na rede interna da Trensurb em 10.80.0.100:8888
COLETOR_URL = "https://tap-venues-corporate-suitable.trycloudflare.com/command"
COLETOR_SECRET = "sgm-trensurb-2026"

GERADORES_CONFIG = {
    "a600f012-21bb-4099-8ad4-b333aa4bf202": ("GMG-MERCADO",       "dse"),
    "a152d185-e7f0-4ad2-82c9-186d6cc1f3fa": ("GMG-RODOVIARIA",    "dse"),
    "fb62f3ea-ce71-4be5-bf7a-e945d37a0ee0": ("GMG-SAOPEDRO",      "dse"),
    "87aab616-83db-4999-9d65-5ca863dce963": ("GMG-FARRAPOS",      "dse"),
    "0dc7f43c-1f43-468b-8f06-c26ba1bda740": ("GMG-AEROPORTO",     "stemac"),
    "4815b42c-85b5-4bf7-9273-4e27b2ea00f4": ("GMG-ANCHIETA",      "stemac"),
    "39704013-9edc-4b1e-aa52-0c7ff8399b56": ("GMG-NITEROI",       "stemac"),
    "446faf85-0d4f-406e-84ff-27b44d87b0d9": ("GMG-FATIMA",        "stemac"),
    "5d3250ae-0640-4e45-ad25-27fdf175420e": ("GMG-CANOAS",        "dse"),
    "5ab60bf2-5075-4ed2-a592-0471e5fdbe69": ("GMG-MATHIASVELHO",  "stemac"),
    "34b49947-bf58-47ef-9e17-f00be9f46e7a": ("GMG-SAOLUIS",       "stemac"),
    "f116c3c6-449e-4911-bd6f-516e739764f3": ("GMG-PETROBRAS",     "stemac"),
    "91375aaa-bc88-47e2-a269-999bf0aa5262": ("GMG-ESTEIO",        "dse"),
    "5add67ec-4578-42cb-be42-110c020be80b": ("GMG-LUIZPASTEUR",   "dse"),
    "fa52c2a7-d339-4500-8ca5-38f701caf41a": ("GMG-SAPUCAIA",      "stemac"),
    "24a85079-fc43-44fb-ad06-e8233e878ba9": ("GMG-UNISINOS",      "dse"),
    "edb209f2-a77d-4525-8688-dc0694734a99": ("GMG-SAOLEOPOLDO",   "stemac"),
    "ae8fc3bb-bc93-4e0c-9838-81579f71e907": ("GMG-RIOSINOS",      "dse"),
    "50fac9e0-5706-454b-a2f4-127029c38473": ("GMG-SANTOAFONSO",   "dse"),
    "32f60fc0-968a-4c2d-b420-683ff6de533f": ("GMG-INDUSTRIAL",    "dse"),
    "2a5aa59d-b389-44d4-92fd-be109fed2c6e": ("GMG-FENAC",         "dse"),
    "e5ed5469-2ac7-4217-8e2e-47b2864ddcbb": ("GMG-NOVOHAMBURGO",  "dse"),
    "568469db-f8ec-4cbc-a84e-82053dc567e4": ("GMG-SUBESTACAO2",   "stemac"),
    "c6a50466-9a7c-4d8a-a073-fc325852e974": ("GMG-BACIA1",        "dse"),
    "4e29d4fb-2384-494c-b1ab-e7712fb36c72": ("GMG-BACIA2",        "dse"),
}

CARGOS_AUTORIZADOS = {"TECHNICIAN", "ENGINEER", "ADMIN", "technician", "engineer", "admin"}

@router.post("/{asset_id}/command", response_model=ComandoResponse)
async def comando_gerador(
    asset_id: str,
    body: ComandoRequest,
    db: Session = Depends(get_db),
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

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(COLETOR_URL, json={
                "secret": COLETOR_SECRET,
                "tag": tag,
                "action": body.action,
            })
            if r.status_code == 200:
                return ComandoResponse(
                    success=True,
                    message=f"Comando '{body.action}' enviado para {tag}.",
                    asset_id=asset_id,
                    action=body.action,
                )
            else:
                detail = r.json().get("error", "Erro no coletor")
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Coletor Modbus offline ou inacessivel. Verifique se o servico esta rodando na rede da Trensurb.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timeout ao conectar ao coletor Modbus.",
        )

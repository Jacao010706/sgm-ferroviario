from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal
import logging

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.services.modbus_command import enviar_comando_gerador, ComandoError

log = logging.getLogger(__name__)

router = APIRouter(prefix="/generators", tags=["generators"])

class ComandoRequest(BaseModel):
    action: Literal["start", "stop", "auto"]

class ComandoResponse(BaseModel):
    success: bool
    message: str
    asset_id: str
    action: str

GERADORES_CONFIG = {
    "a600f012-21bb-4099-8ad4-b333aa4bf202": ("10.80.0.1",  22, "dse"),
    "a152d185-e7f0-4ad2-82c9-186d6cc1f3fa": ("10.80.0.2",  29, "dse"),
    "fb62f3ea-ce71-4be5-bf7a-e945d37a0ee0": ("10.80.0.3",  30, "dse"),
    "87aab616-83db-4999-9d65-5ca863dce963": ("10.80.0.4",  22, "dse"),
    "0dc7f43c-1f43-468b-8f06-c26ba1bda740": ("10.80.0.5",  22, "stemac"),
    "4815b42c-85b5-4bf7-9273-4e27b2ea00f4": ("10.80.0.6",  22, "stemac"),
    "39704013-9edc-4b1e-aa52-0c7ff8399b56": ("10.80.0.7",  22, "stemac"),
    "446faf85-0d4f-406e-84ff-27b44d87b0d9": ("10.80.0.8",  22, "stemac"),
    "5d3250ae-0640-4e45-ad25-27fdf175420e": ("10.80.0.26", 11, "dse"),
    "5ab60bf2-5075-4ed2-a592-0471e5fdbe69": ("10.80.0.10", 22, "stemac"),
    "34b49947-bf58-47ef-9e17-f00be9f46e7a": ("10.80.0.11", 22, "stemac"),
    "f116c3c6-449e-4911-bd6f-516e739764f3": ("10.80.0.12", 22, "stemac"),
    "91375aaa-bc88-47e2-a269-999bf0aa5262": ("10.80.0.13", 13, "dse"),
    "5add67ec-4578-42cb-be42-110c020be80b": ("10.80.0.14", 10, "dse"),
    "fa52c2a7-d339-4500-8ca5-38f701caf41a": ("10.80.0.15", 22, "stemac"),
    "24a85079-fc43-44fb-ad06-e8233e878ba9": ("10.80.0.16", 16, "dse"),
    "edb209f2-a77d-4525-8688-dc0694734a99": ("10.80.0.17", 22, "stemac"),
    "ae8fc3bb-bc93-4e0c-9838-81579f71e907": ("10.80.0.18", 22, "dse"),
    "50fac9e0-5706-454b-a2f4-127029c38473": ("10.80.0.19", 19, "dse"),
    "32f60fc0-968a-4c2d-b420-683ff6de533f": ("10.80.0.20", 20, "dse"),
    "2a5aa59d-b389-44d4-92fd-be109fed2c6e": ("10.80.0.21", 21, "dse"),
    "e5ed5469-2ac7-4217-8e2e-47b2864ddcbb": ("10.80.0.22", 22, "dse"),
    "568469db-f8ec-4cbc-a84e-82053dc567e4": ("10.80.0.23", 22, "stemac"),
    "c6a50466-9a7c-4d8a-a073-fc325852e974": ("10.80.0.24", 22, "dse"),
    "4e29d4fb-2384-494c-b1ab-e7712fb36c72": ("10.80.0.25", 22, "dse"),
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
            detail="Gerador sem configuracao Modbus registrada.")

    ip, slave_id, tipo = config

    if tipo == "stemac":
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Comando remoto STEMAC ST2160 pendente de tabela Modbus do fabricante.")

    log.info(f"Comando '{body.action}' por {current_user.email} -> {ip} [slave={slave_id}]")

    try:
        enviar_comando_gerador(ip, slave_id, body.action, tipo)
    except ComandoError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    return ComandoResponse(
        success=True,
        message=f"Comando '{body.action}' enviado com sucesso.",
        asset_id=asset_id,
        action=body.action,
    )

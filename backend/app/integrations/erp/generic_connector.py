"""
Conector ERP genérico — usa REST puro sem protocolo específico.
Serve como fallback e para sistemas customizados.
"""
import structlog
from typing import Optional
from app.integrations.erp.base_connector import BaseERPConnector, ERPWorkOrder, ERPAsset, ERPPart

log = structlog.get_logger(__name__)


class GenericERPConnector(BaseERPConnector):
    async def authenticate(self) -> bool:
        log.info("Conector ERP genérico — sem autenticação configurada")
        return True

    async def create_work_order(self, wo_data: dict) -> str:
        log.warning("ERP genérico: create_work_order não implementado")
        return ""

    async def update_work_order(self, external_id: str, wo_data: dict) -> bool:
        return False

    async def close_work_order(self, external_id: str, completion_data: dict) -> bool:
        return False

    async def get_work_order(self, external_id: str) -> Optional[ERPWorkOrder]:
        return None

    async def get_asset(self, external_id: str) -> Optional[ERPAsset]:
        return None

    async def get_parts_stock(self, part_codes: list[str]) -> list[ERPPart]:
        return []

    async def create_parts_request(self, wo_external_id: str, parts: list[dict]) -> str:
        return ""

    async def get_cost_centers(self) -> list[dict]:
        return []

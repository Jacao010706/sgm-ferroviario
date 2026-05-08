"""
Conector TOTVS Protheus via REST API (Fluig/TOTVS Framework v1).
Módulo de manutenção: MNT, Ordens de Manutenção (MA480).
"""
import structlog
import httpx
from datetime import datetime
from typing import Optional
from app.core.config import settings
from app.integrations.erp.base_connector import BaseERPConnector, ERPWorkOrder, ERPAsset, ERPPart

log = structlog.get_logger(__name__)


class TOTVSConnector(BaseERPConnector):
    def __init__(self):
        self.base_url = settings.TOTVS_BASE_URL
        self.username = settings.TOTVS_USERNAME
        self.password = settings.TOTVS_PASSWORD
        self._token: str | None = None

    async def authenticate(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/oauth2/v1/token",
                    data={
                        "grant_type": "password",
                        "username": self.username,
                        "password": self.password,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                resp.raise_for_status()
                self._token = resp.json()["access_token"]
                return True
        except Exception as e:
            log.error("TOTVS autenticação falhou", error=str(e))
            return False

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

    async def _ensure_token(self):
        if not self._token:
            await self.authenticate()

    async def create_work_order(self, wo_data: dict) -> str:
        await self._ensure_token()
        payload = {
            "MA4_FILIAL": "01",
            "MA4_CODIGO": "",  # gerado pelo Protheus
            "MA4_DESCRI": wo_data.get("title", ""),
            "MA4_EQUIPA": wo_data.get("erp_asset_id", ""),
            "MA4_TIPO":   "PM" if wo_data.get("maintenance_type") == "preventive" else "CM",
            "MA4_PRIORI": {"critical": "1", "high": "2", "medium": "3", "low": "4"}.get(
                wo_data.get("priority", "medium"), "3"
            ),
            "MA4_ABERTU": datetime.utcnow().strftime("%Y%m%d"),
            "MA4_OBSEVA": wo_data.get("description", ""),
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/mnt/v1/workorder",
                    json=payload,
                    headers=self._headers(),
                )
                resp.raise_for_status()
                ext_id = resp.json().get("MA4_CODIGO", "")
                log.info("OS criada no TOTVS", code=ext_id)
                return ext_id
        except Exception as e:
            log.error("Falha ao criar OS no TOTVS", error=str(e))
            raise

    async def update_work_order(self, external_id: str, wo_data: dict) -> bool:
        await self._ensure_token()
        status_map = {
            "in_progress": "2",
            "completed":   "4",
            "cancelled":   "5",
            "waiting_parts": "6",
        }
        payload = {"MA4_SITUA": status_map.get(wo_data.get("status", ""), "1")}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.put(
                    f"{self.base_url}/mnt/v1/workorder/{external_id}",
                    json=payload,
                    headers=self._headers(),
                )
                return resp.status_code in (200, 204)
        except Exception as e:
            log.error("Falha ao atualizar OS no TOTVS", error=str(e))
            return False

    async def close_work_order(self, external_id: str, completion_data: dict) -> bool:
        await self._ensure_token()
        payload = {
            "MA4_SITUA":  "4",
            "MA4_DTFIM":  datetime.utcnow().strftime("%Y%m%d"),
            "MA4_HRAFIM": datetime.utcnow().strftime("%H%M%S"),
            "MA4_HRTRAB": str(int(completion_data.get("actual_duration_h", 0) * 100)),
            "MA4_OBSEVA": completion_data.get("observations", ""),
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.put(
                    f"{self.base_url}/mnt/v1/workorder/{external_id}/close",
                    json=payload,
                    headers=self._headers(),
                )
                return resp.status_code in (200, 204)
        except Exception as e:
            log.error("Falha ao encerrar OS no TOTVS", error=str(e))
            return False

    async def get_work_order(self, external_id: str) -> Optional[ERPWorkOrder]:
        await self._ensure_token()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.base_url}/mnt/v1/workorder/{external_id}",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                d = resp.json()
                return ERPWorkOrder(
                    external_id=d["MA4_CODIGO"],
                    number=d["MA4_CODIGO"],
                    title=d.get("MA4_DESCRI", ""),
                    asset_external_id=d.get("MA4_EQUIPA", ""),
                    status=d.get("MA4_SITUA", "1"),
                    priority=d.get("MA4_PRIORI", "3"),
                )
        except Exception:
            return None

    async def get_asset(self, external_id: str) -> Optional[ERPAsset]:
        await self._ensure_token()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.base_url}/mnt/v1/equipment/{external_id}",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                d = resp.json()
                return ERPAsset(
                    external_id=d["MA1_CODIGO"],
                    name=d.get("MA1_DESCRI", ""),
                    asset_class=d.get("MA1_CLASSE", ""),
                    location=d.get("MA1_LOCAL", ""),
                    cost_center=d.get("MA1_CC", ""),
                    status=d.get("MA1_SITUA", ""),
                )
        except Exception:
            return None

    async def get_parts_stock(self, part_codes: list[str]) -> list[ERPPart]:
        await self._ensure_token()
        parts = []
        for code in part_codes:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(
                        f"{self.base_url}/estoque/v1/saldo/{code}",
                        headers=self._headers(),
                    )
                    if resp.status_code == 200:
                        d = resp.json()
                        parts.append(ERPPart(
                            external_id=code, code=code,
                            description=d.get("B1_DESC", ""),
                            stock_quantity=float(d.get("saldo", 0)),
                            unit=d.get("B1_UM", "UN"),
                            cost_per_unit=float(d.get("B2_CM1", 0)),
                            min_stock=float(d.get("B1_EMIN", 0)),
                        ))
            except Exception:
                pass
        return parts

    async def create_parts_request(self, wo_external_id: str, parts: list[dict]) -> str:
        await self._ensure_token()
        payload = {
            "Q1_NUMSC": "",
            "Q1_ORDSRV": wo_external_id,
            "itens": [
                {"Q1_PRODUTO": p["code"], "Q1_QUANT": p["quantity"], "Q1_UM": p.get("unit", "UN")}
                for p in parts
            ],
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/compras/v1/solicitacao",
                    json=payload,
                    headers=self._headers(),
                )
                resp.raise_for_status()
                return resp.json().get("Q1_NUMSC", "")
        except Exception as e:
            log.error("Falha ao criar SC no TOTVS", error=str(e))
            raise

    async def get_cost_centers(self) -> list[dict]:
        await self._ensure_token()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(f"{self.base_url}/financeiro/v1/centrocusto", headers=self._headers())
                resp.raise_for_status()
                return [{"id": d["CTT_CUSTO"], "name": d.get("CTT_DESC01", "")} for d in resp.json().get("items", [])]
        except Exception:
            return []

"""
Conector SAP via OData API (SAP S/4HANA / ECC com Gateway).
Usa PM (Plant Maintenance) module: AUFNR, QMEL, EQUNR.
"""
import structlog
import httpx
from datetime import datetime
from typing import Optional
from app.core.config import settings
from app.integrations.erp.base_connector import BaseERPConnector, ERPWorkOrder, ERPAsset, ERPPart

log = structlog.get_logger(__name__)

SAP_STATUS_MAP = {
    "PENDING":        "OSNO",  # OS não iniciada
    "IN_PROGRESS":    "BACO",  # Em execução
    "COMPLETED":      "ABSC",  # Concluída
    "CANCELLED":      "ABGE",  # Cancelada
    "WAITING_PARTS":  "WMAT",  # Aguardando material
}


class SAPConnector(BaseERPConnector):
    def __init__(self):
        self.base_url = settings.SAP_BASE_URL
        self.client_id = settings.SAP_CLIENT_ID
        self.client_secret = settings.SAP_CLIENT_SECRET
        self._token: str | None = None
        self._token_expires: datetime | None = None

    async def authenticate(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/oauth/token",
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                self._token = data["access_token"]
                from datetime import timedelta
                self._token_expires = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
                return True
        except Exception as e:
            log.error("SAP autenticação falhou", error=str(e))
            return False

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "sap-client": "100",
        }

    async def _ensure_token(self):
        if not self._token or datetime.utcnow() >= (self._token_expires or datetime.min):
            await self.authenticate()

    async def create_work_order(self, wo_data: dict) -> str:
        await self._ensure_token()
        payload = {
            "OrderType": "PM01",  # Manutenção preventiva
            "FunctionalLocation": wo_data.get("location_code"),
            "Equipment": wo_data.get("erp_asset_id"),
            "OrderLongText": wo_data.get("description", ""),
            "BasicStartDate": wo_data.get("scheduled_start", datetime.utcnow()).strftime("%Y%m%d"),
            "BasicFinishDate": wo_data.get("scheduled_end", datetime.utcnow()).strftime("%Y%m%d"),
            "PlannerGroup": "PM01",
            "MainWorkCenter": "ELET001",
            "Priority": {"critical": "1", "high": "2", "medium": "3", "low": "4"}.get(
                wo_data.get("priority", "medium"), "3"
            ),
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/sap/opu/odata/sap/API_MAINTENANCEORDER_SRV/MaintenanceOrderSet",
                    json=payload,
                    headers=self._headers(),
                )
                resp.raise_for_status()
                order_id = resp.json()["d"]["MaintenanceOrder"]
                log.info("OS criada no SAP", order_id=order_id)
                return order_id
        except Exception as e:
            log.error("Falha ao criar OS no SAP", error=str(e))
            raise

    async def update_work_order(self, external_id: str, wo_data: dict) -> bool:
        await self._ensure_token()
        sap_status = SAP_STATUS_MAP.get(wo_data.get("status", ""), "OSNO")
        payload = {"SystemStatus": sap_status}
        if wo_data.get("actual_start"):
            payload["ActualStartDate"] = wo_data["actual_start"].strftime("%Y%m%d")
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.patch(
                    f"{self.base_url}/sap/opu/odata/sap/API_MAINTENANCEORDER_SRV/MaintenanceOrderSet('{external_id}')",
                    json=payload,
                    headers=self._headers(),
                )
                return resp.status_code in (200, 204)
        except Exception as e:
            log.error("Falha ao atualizar OS no SAP", error=str(e), order=external_id)
            return False

    async def close_work_order(self, external_id: str, completion_data: dict) -> bool:
        await self._ensure_token()
        payload = {
            "SystemStatus": "ABSC",
            "ActualFinishDate": datetime.utcnow().strftime("%Y%m%d"),
            "ActualWork": str(completion_data.get("actual_duration_h", 0)),
            "LongText": completion_data.get("observations", ""),
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.patch(
                    f"{self.base_url}/sap/opu/odata/sap/API_MAINTENANCEORDER_SRV/MaintenanceOrderSet('{external_id}')",
                    json=payload,
                    headers=self._headers(),
                )
                return resp.status_code in (200, 204)
        except Exception as e:
            log.error("Falha ao encerrar OS no SAP", error=str(e))
            return False

    async def get_work_order(self, external_id: str) -> Optional[ERPWorkOrder]:
        await self._ensure_token()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.base_url}/sap/opu/odata/sap/API_MAINTENANCEORDER_SRV/MaintenanceOrderSet('{external_id}')",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                d = resp.json()["d"]
                return ERPWorkOrder(
                    external_id=d["MaintenanceOrder"],
                    number=d["MaintenanceOrder"],
                    title=d.get("OrderLongText", ""),
                    asset_external_id=d.get("Equipment", ""),
                    status=d.get("SystemStatus", ""),
                    priority=d.get("Priority", "3"),
                )
        except Exception:
            return None

    async def get_asset(self, external_id: str) -> Optional[ERPAsset]:
        await self._ensure_token()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.base_url}/sap/opu/odata/sap/API_EQUIPMENT_SRV/A_Equipment('{external_id}')",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                d = resp.json()["d"]
                return ERPAsset(
                    external_id=d["Equipment"],
                    name=d.get("EquipmentName", ""),
                    asset_class=d.get("AssetClass", ""),
                    location=d.get("FunctionalLocation", ""),
                    cost_center=d.get("CostCenter", ""),
                    status=d.get("EquipmentStatus", ""),
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
                        f"{self.base_url}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod(Material='{code}',Plant='0001')",
                        headers=self._headers(),
                    )
                    if resp.status_code == 200:
                        d = resp.json()["d"]
                        parts.append(ERPPart(
                            external_id=code, code=code,
                            description=d.get("MaterialName", ""),
                            stock_quantity=float(d.get("MatlWrhsStkQtyInMatlBaseUnit", 0)),
                            unit=d.get("BaseUnit", "UN"),
                            cost_per_unit=float(d.get("MaterialBaseQuantity", 0)),
                            min_stock=0.0,
                        ))
            except Exception:
                pass
        return parts

    async def create_parts_request(self, wo_external_id: str, parts: list[dict]) -> str:
        await self._ensure_token()
        items = [
            {
                "Material": p["code"],
                "RequestedQuantity": str(p["quantity"]),
                "BaseUnit": p.get("unit", "UN"),
                "OrderID": wo_external_id,
            }
            for p in parts
        ]
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/sap/opu/odata/sap/API_RESERVATION_SRV/A_ReservationItem",
                    json={"items": items},
                    headers=self._headers(),
                )
                resp.raise_for_status()
                return resp.json()["d"].get("Reservation", "")
        except Exception as e:
            log.error("Falha ao criar requisição de material SAP", error=str(e))
            raise

    async def get_cost_centers(self) -> list[dict]:
        await self._ensure_token()
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.base_url}/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                return [{"id": d["CostCenter"], "name": d.get("CostCenterName", "")}
                        for d in resp.json()["d"]["results"]]
        except Exception:
            return []

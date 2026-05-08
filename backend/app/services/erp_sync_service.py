"""
Serviço de sincronização bidirecional com ERP.
"""
from datetime import datetime
import structlog
from app.integrations.erp.erp_factory import get_erp_connector
from app.models.maintenance import WorkOrder

log = structlog.get_logger(__name__)


async def sync_work_order_to_erp(wo: WorkOrder) -> bool:
    connector = get_erp_connector()
    try:
        if not wo.erp_wo_id:
            ext_id = await connector.create_work_order({
                "title": wo.title,
                "description": wo.description,
                "erp_asset_id": wo.asset.erp_asset_id if wo.asset else None,
                "maintenance_type": wo.maintenance_type,
                "priority": wo.priority,
                "scheduled_start": wo.scheduled_start,
                "scheduled_end": wo.scheduled_end,
            })
            wo.erp_wo_id = ext_id

        if wo.status == "completed":
            await connector.close_work_order(wo.erp_wo_id, {
                "actual_duration_h": wo.actual_duration_h,
                "observations": wo.observations,
                "root_cause": wo.root_cause,
            })
        else:
            await connector.update_work_order(wo.erp_wo_id, {"status": wo.status})

        wo.synced_erp = True
        wo.synced_at = datetime.utcnow()
        log.info("OS sincronizada com ERP", wo_number=wo.number, erp_id=wo.erp_wo_id)
        return True
    except Exception as e:
        log.error("Falha na sincronização com ERP", wo=wo.number, error=str(e))
        return False


async def check_parts_availability(part_codes: list[str]) -> list[dict]:
    connector = get_erp_connector()
    parts = await connector.get_parts_stock(part_codes)
    return [
        {
            "code": p.code,
            "description": p.description,
            "stock": p.stock_quantity,
            "unit": p.unit,
            "available": p.stock_quantity > p.min_stock,
        }
        for p in parts
    ]

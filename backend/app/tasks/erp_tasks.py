from app.worker import app as celery_app


@celery_app.task(name="app.tasks.erp_tasks.sync_pending_work_orders")
def sync_pending_work_orders():
    import asyncio
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.maintenance import WorkOrder, WorkOrderStatus
    from app.services.erp_sync_service import sync_work_order_to_erp

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(WorkOrder).where(
                    WorkOrder.synced_erp == False,
                    WorkOrder.status == WorkOrderStatus.COMPLETED,
                ).limit(50)
            )
            orders = result.scalars().all()
            synced = 0
            for wo in orders:
                try:
                    ok = await sync_work_order_to_erp(wo)
                    if ok:
                        synced += 1
                except Exception:
                    pass
            await db.commit()
            return synced

    return asyncio.run(_run())

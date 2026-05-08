from datetime import datetime
from app.worker import app as celery_app


@celery_app.task(name="app.tasks.maintenance_tasks.generate_overdue_work_orders")
def generate_overdue_work_orders():
    """Verifica planos vencidos e gera OS automaticamente"""
    import asyncio
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.maintenance import MaintenancePlan, WorkOrder
    from app.api.v1.work_orders import generate_os_number
    from app.api.v1.maintenance import FREQUENCY_DAYS

    async def _run():
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()
            result = await db.execute(
                select(MaintenancePlan).where(
                    MaintenancePlan.is_active == True,
                    MaintenancePlan.next_due <= now,
                )
            )
            plans = result.scalars().all()
            generated = 0
            for plan in plans:
                existing = await db.execute(
                    select(WorkOrder).where(
                        WorkOrder.maintenance_plan_id == plan.id,
                        WorkOrder.status.not_in(["completed", "cancelled"]),
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                wo = WorkOrder(
                    number=generate_os_number(),
                    title=f"[PM] {plan.name}",
                    asset_id=plan.asset_id,
                    maintenance_type=plan.maintenance_type,
                    priority=plan.priority,
                    maintenance_plan_id=plan.id,
                    estimated_duration_h=plan.estimated_duration_h,
                )
                db.add(wo)
                days = FREQUENCY_DAYS.get(plan.frequency, plan.frequency_days or 30)
                from datetime import timedelta
                plan.next_due = now + timedelta(days=days)
                generated += 1
            await db.commit()
            return generated

    return asyncio.run(_run())


@celery_app.task(name="app.tasks.maintenance_tasks.send_alert_notification")
def send_alert_notification(alert_id: str):
    """Envia notificação push/email para alertas críticos"""
    import asyncio
    from app.services.notification_service import notify_alert

    asyncio.run(notify_alert(alert_id))

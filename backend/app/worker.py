from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

app = Celery("sgm", broker=settings.RABBITMQ_URL, backend=settings.REDIS_URL)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Sao_Paulo",
    enable_utc=True,
)

# ─── Tarefas agendadas ───────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Verificar planos vencidos e gerar OS — a cada hora
    "generate-due-work-orders": {
        "task": "app.tasks.maintenance_tasks.generate_overdue_work_orders",
        "schedule": crontab(minute=0),
    },
    # Sincronizar com ERP — a cada 15 minutos
    "sync-erp": {
        "task": "app.tasks.erp_tasks.sync_pending_work_orders",
        "schedule": crontab(minute="*/15"),
    },
    # Calcular KPIs de disponibilidade — diariamente às 02h
    "calculate-availability-kpis": {
        "task": "app.tasks.kpi_tasks.calculate_asset_availability",
        "schedule": crontab(hour=2, minute=0),
    },
    # Enviar relatório diário por email — 07h
    "daily-report": {
        "task": "app.tasks.report_tasks.send_daily_summary",
        "schedule": crontab(hour=7, minute=0),
    },
}

# Importar tasks
import app.tasks.maintenance_tasks  # noqa
import app.tasks.erp_tasks          # noqa

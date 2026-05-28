from fastapi import APIRouter
from app.api.v1 import auth, assets, work_orders, maintenance, alerts, iot, admin, checklists, teams, notifications, parts, fuel_orders

api_router = APIRouter(prefix="/api/v1", redirect_slashes=False)
api_router.include_router(auth.router)
api_router.include_router(assets.router)
api_router.include_router(assets.locations_router)
api_router.include_router(work_orders.router)
api_router.include_router(maintenance.router)
api_router.include_router(alerts.router)
api_router.include_router(iot.router)
api_router.include_router(admin.router)
api_router.include_router(checklists.router)
api_router.include_router(teams.router)
api_router.include_router(notifications.router)
api_router.include_router(parts.router)
api_router.include_router(fuel_orders.router)
from fastapi import APIRouter
from app.api.v1 import auth, assets, work_orders, maintenance, alerts, iot, admin

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(assets.router)
api_router.include_router(assets.locations_router)
api_router.include_router(work_orders.router)
api_router.include_router(maintenance.router)
api_router.include_router(alerts.router)
api_router.include_router(iot.router)
api_router.include_router(admin.router)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
from prometheus_fastapi_instrumentator import Instrumentator
from app.core.config import settings
from app.core.database import create_tables
from app.api.v1.router import api_router

log = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Iniciando SGM Ferroviario", version=settings.VERSION, env=settings.ENVIRONMENT)
    import asyncio
    for attempt in range(5):
        try:
            await create_tables()
            log.info("Banco de dados conectado com sucesso")
            break
        except Exception as e:
            log.warning("Tentativa de conexao ao banco falhou", attempt=attempt + 1, error=str(e))
            if attempt < 4:
                await asyncio.sleep(3)
    try:
        from app.integrations.iot.iot_gateway import IoTGateway
        iot = IoTGateway()
        asyncio.create_task(iot.start())
    except Exception as e:
        log.warning("IoT Gateway nao iniciado", error=str(e))
    try:
        from app.integrations.scada.scada_gateway import ScadaGateway
        scada = ScadaGateway()
        asyncio.create_task(scada.start())
    except Exception as e:
        log.warning("SCADA Gateway nao iniciado", error=str(e))
    log.info("Sistema iniciado com sucesso")
    yield
    log.info("Encerrando sistema")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Sistema de Gestao de Manutencao Ferroviario",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION, "env": settings.ENVIRONMENT}

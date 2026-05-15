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
    log.info("Iniciando SGM Ferroviário", version=settings.VERSION, env=settings.ENVIRONMENT)

    # Conectar ao banco com retry
    import asyncio
    for attempt in range(5):
        try:
            await create_tables()
            log.info("Banco de dados conectado com sucesso")
            break
        except Exception as e:
            log.warning("Tentativa de conexão ao banco falhou", attempt=attempt + 1, error=str(e))
            if attempt < 4:
                await asyncio.sleep(3)

    # Iniciar gateway IoT/MQTT em background (falha silenciosa se MQTT indisponível)
    try:
        from app.integrations.iot.iot_gateway import IoTGateway
        iot = IoTGateway()
        asyncio.create_task(iot.start())
    except Exception as e:
        log.warning("IoT Gateway não iniciado", error=str(e))

    # Iniciar bridge SCADA em background (falha silenciosa se SCADA indisponível)
    try:
        from app.integrations.scada.scada_gateway import ScadaGateway
        scada = ScadaGateway()
        asyncio.create_task(scada.start())
    except Exception as e:
        log.warning("SCADA Gateway não iniciado", error=str(e))

    log.info("Sistema iniciado com sucesso")
    yield
    log.info("Encerrando sistema")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Sistema de Gestão de Manutenção para Subestações e Geradores Ferroviários",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else ["https://sgm.empresa.com.br", "https://laudable-peace-production-09cd.up.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION, "env": settings.ENVIRONMENT}

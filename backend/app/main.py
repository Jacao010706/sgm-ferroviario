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
    from app.models import part, fuel_order
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
    # Usuario administrador inicial.
    #
    # Antes este bloco criava, a cada inicializacao, o usuario admin2@sgm.com com
    # a senha "admin123" escrita aqui no codigo. Era uma conta de administrador
    # com senha publica, recriada sozinha mesmo que alguem a removesse do banco.
    #
    # Agora so cria se as duas variaveis estiverem definidas no ambiente, e
    # nunca com senha literal. Sem elas, nao cria nada.
    try:
        import os as _os
        _email = _os.getenv("ADMIN_INICIAL_EMAIL")
        _senha = _os.getenv("ADMIN_INICIAL_SENHA")
        if _email and _senha:
            from app.models.user import User, UserRole
            from app.core.security import hash_password
            from sqlalchemy.ext.asyncio import AsyncSession
            from sqlalchemy import select
            from app.core.database import engine
            async with AsyncSession(engine) as _db:
                _r = await _db.execute(select(User).where(User.email == _email))
                if not _r.scalar_one_or_none():
                    _u = User(name="Administrador", email=_email,
                              hashed_password=hash_password(_senha), role=UserRole.ADMIN)
                    _db.add(_u)
                    await _db.commit()
                    log.info("Usuario administrador inicial criado", email=_email)
        else:
            log.info("ADMIN_INICIAL_EMAIL/SENHA nao definidos - nenhum usuario criado")
    except Exception as e:
        log.warning("Falha ao criar usuario inicial", error=str(e))

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
    redirect_slashes=False,
)
import os
_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000") + ",https://sgm-geradores-production.up.railway.app,https://sgm-geradores-trensurb-production.up.railway.app"
origins = [o.strip() for o in _raw.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"], allow_headers=["*"], expose_headers=["*"])
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = "upgrade-insecure-requests"
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.include_router(api_router)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION, "env": settings.ENVIRONMENT}

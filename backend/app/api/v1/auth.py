from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, hash_password, decode_token
from app.models.user import User, UserRole
from app.api.deps import get_current_user
from fastapi.security import OAuth2PasswordBearer

# Token opcional: /register aceita chamada sem login apenas para criar o
# primeiro usuario do sistema. Depois disso exige administrador.
_token_opcional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    role: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.TECHNICIAN
    badge_number: str | None = None
    phone: str | None = None


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    user.last_login = datetime.utcnow()
    await db.commit()
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
        user_id=str(user.id),
        name=user.name,
        role=user.role.value,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
        user_id=str(user.id),
        name=user.name,
        role=user.role.value,
    )


@router.post("/register", status_code=201)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(_token_opcional),
):
    """
    Cria usuario.

    Sem usuarios no banco, cria o primeiro como administrador sem pedir login
    -- e o unico jeito de inicializar o sistema. A partir dai so um
    administrador autenticado cria contas.

    Ate 21/09/2026 a rota era aberta e usava o cargo enviado pelo proprio
    visitante (role=body.role). Qualquer pessoa na internet criava uma conta
    ADMIN para si e, com ela, acionava geradores pelo painel do CCO.
    """
    try:
        count_result = await db.execute(select(User))
        is_first = count_result.first() is None

        if not is_first:
            payload = decode_token(token) if token else None
            if not payload or payload.get("type") == "refresh" or not payload.get("sub"):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail="Apenas administradores podem criar usuarios.")
            quem = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
            if not quem or not quem.is_active or quem.role != UserRole.ADMIN:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="Apenas administradores podem criar usuarios.")

        existing = await db.execute(select(User).where(User.email == body.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        user = User(
            name=body.name,
            email=body.email,
            hashed_password=hash_password(body.password),
            role=UserRole.ADMIN if is_first else body.role,
            badge_number=body.badge_number,
            phone=body.phone,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"[DEBUG] {type(e).__name__}: {str(e)}")


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "badge_number": current_user.badge_number,
        "team_id": str(current_user.team_id) if current_user.team_id else None,
    }

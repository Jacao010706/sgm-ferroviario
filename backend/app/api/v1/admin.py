from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/admin", tags=["Administração"])


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.TECHNICIAN
    badge_number: Optional[str] = None
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    badge_number: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users", dependencies=[Depends(require_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    """Lista todos os usuários. Apenas admin."""
    result = await db.execute(select(User).order_by(User.name))
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "badge_number": u.badge_number,
            "phone": u.phone,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.post("/users", status_code=201, dependencies=[Depends(require_admin)])
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo usuário com qualquer role. Apenas admin."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        badge_number=body.badge_number,
        phone=body.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "badge_number": user.badge_number,
        "phone": user.phone,
        "is_active": user.is_active,
    }


@router.patch("/users/{user_id}", dependencies=[Depends(require_admin)])
async def update_user(user_id: str, body: UserUpdate, db: AsyncSession = Depends(get_db)):
    """Atualiza dados ou role de um usuário. Apenas admin."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.badge_number is not None:
        user.badge_number = body.badge_number
    if body.phone is not None:
        user.phone = body.phone
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "badge_number": user.badge_number,
        "phone": user.phone,
        "is_active": user.is_active,
    }


@router.delete("/users/{user_id}", status_code=204, dependencies=[Depends(require_admin)])
async def deactivate_user(user_id: str, db: AsyncSession = Depends(get_db)):
    """Desativa um usuário (soft delete). Apenas admin."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.is_active = False
    await db.commit()
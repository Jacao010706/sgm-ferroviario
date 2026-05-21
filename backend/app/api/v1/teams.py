from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from app.core.database import get_db
from app.models.user import User, Team, UserRole
from app.api.deps import get_current_user, require_manager

router = APIRouter(prefix="/teams", tags=["Equipes"])

class TeamCreate(BaseModel):
    name: str
    specialty: Optional[str] = None
    description: Optional[str] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    description: Optional[str] = None

@router.get("/")
async def list_teams(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Team).order_by(Team.name))
    teams = result.scalars().all()
    out = []
    for t in teams:
        members_result = await db.execute(select(User).where(User.team_id == t.id, User.is_active == True))
        members = members_result.scalars().all()
        out.append({
            "id": str(t.id),
            "name": t.name,
            "specialty": t.specialty,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "members": [{"id": str(m.id), "name": m.name, "email": m.email, "role": m.role, "badge_number": m.badge_number, "phone": m.phone} for m in members],
            "member_count": len(members),
        })
    return out

@router.get("/members")
async def list_all_members(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(User).where(User.is_active == True).order_by(User.name))
    users = result.scalars().all()
    return [{"id": str(u.id), "name": u.name, "email": u.email, "role": u.role, "badge_number": u.badge_number, "phone": u.phone, "team_id": str(u.team_id) if u.team_id else None} for u in users]

@router.post("/", status_code=201)
async def create_team(body: TeamCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    team = Team(name=body.name, specialty=body.specialty, description=body.description)
    db.add(team)
    await db.flush()
    await db.refresh(team)
    await db.commit()
    return {"id": str(team.id), "name": team.name, "specialty": team.specialty, "description": team.description, "members": [], "member_count": 0}

@router.patch("/{team_id}")
async def update_team(team_id: UUID, body: TeamUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe nao encontrada")
    if body.name is not None: team.name = body.name
    if body.specialty is not None: team.specialty = body.specialty
    if body.description is not None: team.description = body.description
    await db.commit()
    return {"id": str(team.id), "name": team.name, "specialty": team.specialty}

@router.delete("/{team_id}", status_code=204)
async def delete_team(team_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe nao encontrada")
    await db.delete(team)
    await db.commit()

@router.post("/{team_id}/members/{user_id}")
async def add_member(team_id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    user.team_id = team_id
    await db.commit()
    return {"status": "ok"}

@router.delete("/{team_id}/members/{user_id}")
async def remove_member(team_id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    user.team_id = None
    await db.commit()
    return {"status": "ok"}

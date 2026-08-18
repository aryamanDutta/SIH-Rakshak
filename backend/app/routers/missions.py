from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import mission_service

router = APIRouter()

class MissionStartRequest(BaseModel):
    name: str
    mission_type: str
    squad_id: int
    conditions: Optional[str] = None

@router.get("")
async def list_missions(db: AsyncSession = Depends(get_db)):
    missions = await mission_service.get_all_missions(db)
    return [
        {
            "id": m.id,
            "mission_uid": m.mission_uid,
            "name": m.name,
            "mission_type": m.mission_type,
            "squad_id": m.squad_id,
            "status": m.status.value if hasattr(m.status, 'value') else str(m.status),
            "conditions": m.conditions,
            "started_at": m.started_at.isoformat() if m.started_at else None,
            "ended_at": m.ended_at.isoformat() if m.ended_at else None,
        }
        for m in missions
    ]

@router.post("/start")
async def start_mission(req: MissionStartRequest, db: AsyncSession = Depends(get_db)):
    mission = await mission_service.start_mission(
        name=req.name, mission_type=req.mission_type,
        squad_id=req.squad_id, conditions=req.conditions, db=db
    )
    return {
        "id": mission.id,
        "mission_uid": mission.mission_uid,
        "name": mission.name,
        "status": mission.status.value if hasattr(mission.status, 'value') else str(mission.status),
        "started_at": mission.started_at.isoformat() if mission.started_at else None,
    }

@router.post("/{mission_id}/end")
@router.post("/{mission_id}/stop")
async def stop_mission(mission_id: int, db: AsyncSession = Depends(get_db)):
    mission = await mission_service.stop_mission(mission_id, db)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {
        "id": mission.id,
        "status": mission.status.value if hasattr(mission.status, 'value') else str(mission.status),
        "ended_at": mission.ended_at.isoformat() if mission.ended_at else None,
    }

@router.get("/{mission_id}")
async def get_mission(mission_id: int, db: AsyncSession = Depends(get_db)):
    mission = await mission_service.get_mission_by_id(mission_id, db)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {
        "id": mission.id,
        "mission_uid": mission.mission_uid,
        "name": mission.name,
        "mission_type": mission.mission_type,
        "status": mission.status.value if hasattr(mission.status, 'value') else str(mission.status),
        "squad_id": mission.squad_id,
        "conditions": mission.conditions,
        "started_at": mission.started_at.isoformat() if mission.started_at else None,
        "ended_at": mission.ended_at.isoformat() if mission.ended_at else None,
    }

@router.get("/{mission_id}/events")
@router.get("/{mission_id}/timeline")
async def get_mission_timeline(mission_id: int, db: AsyncSession = Depends(get_db)):
    events = await mission_service.get_mission_timeline(mission_id, db)
    return [
        {
            "id": e.id,
            "mission_id": e.mission_id,
            "timestamp": e.timestamp.isoformat(),
            "phase": e.phase.value if hasattr(e.phase, 'value') else str(e.phase),
            "description": e.description,
        }
        for e in events
    ]

@router.get("/{mission_id}/fatigue")
async def get_mission_fatigue(mission_id: int, db: AsyncSession = Depends(get_db)):
    return await mission_service.get_mission_fatigue(mission_id, db)

@router.delete("/{mission_id}")
async def delete_mission(mission_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await mission_service.delete_mission(mission_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {"detail": "Mission deleted successfully"}


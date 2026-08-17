from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import squad_service

router = APIRouter()

@router.get("")
async def list_squads(db: AsyncSession = Depends(get_db)):
    squads = await squad_service.get_all_squads(db)
    return [{"id": s.id, "name": s.name, "unit": s.unit, "commander_name": s.commander_name} for s in squads]

@router.get("/{squad_id}")
async def get_squad(squad_id: int, db: AsyncSession = Depends(get_db)):
    squad = await squad_service.get_squad_by_id(squad_id, db)
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    return {"id": squad.id, "name": squad.name, "unit": squad.unit, "commander_name": squad.commander_name}

@router.get("/{squad_id}/status")
async def get_squad_status(squad_id: int, db: AsyncSession = Depends(get_db)):
    return await squad_service.get_squad_status(squad_id, db)

@router.get("/{squad_id}/alerts")
async def get_squad_alerts(squad_id: int, db: AsyncSession = Depends(get_db)):
    alerts = await squad_service.get_squad_alerts(squad_id, db)
    return [
        {"id": a.id, "soldier_id": a.soldier_id, "timestamp": a.timestamp.isoformat(),
         "alert_type": a.alert_type.value, "severity": a.severity.value,
         "message": a.message, "fatigue_score_at_alert": a.fatigue_score_at_alert}
        for a in alerts
    ]

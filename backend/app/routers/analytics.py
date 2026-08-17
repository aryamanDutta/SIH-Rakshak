from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import analytics_service

router = APIRouter()


@router.get("/system/summary")
async def system_summary(db: AsyncSession = Depends(get_db)):
    """System-wide summary: total soldiers, risk distribution, active alerts."""
    return await analytics_service.get_system_summary(db)


@router.get("/squad/{squad_id}/trend")
async def squad_trend(
    squad_id: int,
    hours: int = Query(default=6, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Squad fatigue trend over the last N hours, bucketed by minute."""
    return await analytics_service.get_squad_trend(squad_id, db, hours)


@router.get("/soldier/{soldier_id}/history")
async def soldier_history(
    soldier_id: int,
    hours: int = Query(default=6, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Per-soldier physiological + fatigue history over the last N hours."""
    return await analytics_service.get_soldier_history(soldier_id, db, hours)


# Legacy endpoints
@router.get("/soldier/{soldier_id}")
async def soldier_analytics(soldier_id: int, db: AsyncSession = Depends(get_db)):
    return await analytics_service.get_soldier_analytics(soldier_id, db)


@router.get("/squad/{squad_id}")
async def squad_analytics(squad_id: int, db: AsyncSession = Depends(get_db)):
    return await analytics_service.get_squad_analytics(squad_id, db)


@router.get("/mission/{mission_id}")
async def mission_analytics(mission_id: int, db: AsyncSession = Depends(get_db)):
    return await analytics_service.get_mission_analytics(mission_id, db)

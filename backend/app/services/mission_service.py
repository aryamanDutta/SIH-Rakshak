"""Service layer for missions."""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Mission, MissionStatus, MissionEvent, MissionPhase, FatigueAssessment, Soldier


async def get_all_missions(db: AsyncSession) -> List[Mission]:
    result = await db.execute(select(Mission).order_by(desc(Mission.created_at)))
    return list(result.scalars().all())


async def get_mission_by_id(mission_id: int, db: AsyncSession) -> Optional[Mission]:
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    return result.scalar_one_or_none()


async def start_mission(name: str, mission_type: str, squad_id: int, conditions: Optional[str], db: AsyncSession) -> Mission:
    mission = Mission(
        mission_uid=f"MSN-{uuid.uuid4().hex[:8].upper()}",
        name=name,
        mission_type=mission_type,
        squad_id=squad_id,
        status=MissionStatus.ACTIVE,
        conditions=conditions,
        started_at=datetime.utcnow(),
    )
    db.add(mission)
    await db.commit()
    await db.refresh(mission)
    # Add initial mission event
    event = MissionEvent(
        mission_id=mission.id,
        timestamp=datetime.utcnow(),
        phase=MissionPhase.BRIEFING,
        description=f"Mission '{name}' started.",
    )
    db.add(event)
    await db.commit()
    return mission


async def stop_mission(mission_id: int, db: AsyncSession) -> Optional[Mission]:
    mission = await get_mission_by_id(mission_id, db)
    if mission is None:
        return None
    mission.status = MissionStatus.COMPLETED
    mission.ended_at = datetime.utcnow()
    event = MissionEvent(
        mission_id=mission_id,
        timestamp=datetime.utcnow(),
        phase=MissionPhase.EXTRACTION,
        description="Mission completed.",
    )
    db.add(event)
    await db.commit()
    return mission


async def get_mission_timeline(mission_id: int, db: AsyncSession) -> List[MissionEvent]:
    result = await db.execute(
        select(MissionEvent)
        .where(MissionEvent.mission_id == mission_id)
        .order_by(MissionEvent.timestamp)
    )
    return list(result.scalars().all())


async def get_mission_fatigue(mission_id: int, db: AsyncSession) -> List[dict]:
    """Return fatigue progression throughout mission — one entry per assessment."""
    result = await db.execute(
        select(FatigueAssessment)
        .where(FatigueAssessment.mission_id == mission_id)
        .order_by(FatigueAssessment.timestamp)
    )
    assessments = list(result.scalars().all())
    return [
        {
            "timestamp": a.timestamp.isoformat(),
            "soldier_id": a.soldier_id,
            "fatigue_score": a.fatigue_score,
            "risk_category": a.risk_category.value,
        }
        for a in assessments
    ]

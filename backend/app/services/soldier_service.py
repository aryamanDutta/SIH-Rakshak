"""Service layer for soldier queries and state retrieval."""
from typing import Optional, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Soldier, SensorReading, PhysiologicalFeatures, FatigueAssessment, PersonalBaseline, Alert


async def get_all_soldiers(db: AsyncSession) -> List[Soldier]:
    result = await db.execute(select(Soldier).where(Soldier.is_active == True))
    return list(result.scalars().all())


async def get_soldier_by_id(soldier_id: int, db: AsyncSession) -> Optional[Soldier]:
    result = await db.execute(select(Soldier).where(Soldier.id == soldier_id))
    return result.scalar_one_or_none()


async def get_latest_fatigue(soldier_id: int, db: AsyncSession) -> Optional[FatigueAssessment]:
    result = await db.execute(
        select(FatigueAssessment)
        .where(FatigueAssessment.soldier_id == soldier_id)
        .order_by(desc(FatigueAssessment.timestamp))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_reading(soldier_id: int, db: AsyncSession) -> Optional[SensorReading]:
    result = await db.execute(
        select(SensorReading)
        .where(SensorReading.soldier_id == soldier_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_features(soldier_id: int, db: AsyncSession) -> Optional[PhysiologicalFeatures]:
    result = await db.execute(
        select(PhysiologicalFeatures)
        .where(PhysiologicalFeatures.soldier_id == soldier_id)
        .order_by(desc(PhysiologicalFeatures.timestamp))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_soldier_readings(
    soldier_id: int, db: AsyncSession, limit: int = 50
) -> List[dict]:
    """Retrieve raw and derived sensor readings for a soldier."""
    readings_result = await db.execute(
        select(SensorReading)
        .where(SensorReading.soldier_id == soldier_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(limit)
    )
    readings = list(readings_result.scalars().all())

    features_result = await db.execute(
        select(PhysiologicalFeatures)
        .where(PhysiologicalFeatures.soldier_id == soldier_id)
        .order_by(desc(PhysiologicalFeatures.timestamp))
        .limit(limit)
    )
    features_list = list(features_result.scalars().all())

    features_by_ts = {}
    for f in features_list:
        key = f.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        features_by_ts[key] = f

    out = []
    for r in readings:
        ts_key = r.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        f = features_by_ts.get(ts_key)

        derived_hr = round(60000.0 / r.rr_interval_ms, 1) if r.rr_interval_ms and r.rr_interval_ms > 0 else None

        out.append({
            "id": r.id,
            "soldier_id": r.soldier_id,
            "timestamp": r.timestamp.isoformat(),
            "rr_interval_ms": r.rr_interval_ms,
            "derived_hr": derived_hr,
            "mean_hr": f.mean_hr if f else derived_hr,
            "temperature_c": r.temperature_c,
            "temperature": r.temperature_c,
            "accel_x": r.accel_x,
            "accel_y": r.accel_y,
            "accel_z": r.accel_z,
            "activity_label": r.activity_label,
            "activity_intensity": f.activity_intensity if f else None,
            "sdnn": f.sdnn if f else None,
            "rmssd": f.rmssd if f else None,
            "pnn50": f.pnn50 if f else None,
            "mission_id": r.mission_id,
            "source": r.source.value if hasattr(r.source, "value") else str(r.source),
        })
    return out


async def get_soldier_history(
    soldier_id: int, db: AsyncSession, limit: int = 200
) -> dict:
    readings_result = await db.execute(
        select(SensorReading)
        .where(SensorReading.soldier_id == soldier_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(limit)
    )
    fatigue_result = await db.execute(
        select(FatigueAssessment)
        .where(FatigueAssessment.soldier_id == soldier_id)
        .order_by(desc(FatigueAssessment.timestamp))
        .limit(limit)
    )
    return {
        "readings": list(reversed(readings_result.scalars().all())),
        "fatigue_assessments": list(reversed(fatigue_result.scalars().all())),
    }


async def get_soldier_baseline(soldier_id: int, db: AsyncSession) -> Optional[PersonalBaseline]:
    result = await db.execute(
        select(PersonalBaseline).where(PersonalBaseline.soldier_id == soldier_id)
    )
    return result.scalar_one_or_none()


async def get_soldier_alerts(
    soldier_id: int, db: AsyncSession, limit: int = 50
) -> List[Alert]:
    result = await db.execute(
        select(Alert)
        .where(Alert.soldier_id == soldier_id)
        .order_by(desc(Alert.timestamp))
        .limit(limit)
    )
    return list(result.scalars().all())

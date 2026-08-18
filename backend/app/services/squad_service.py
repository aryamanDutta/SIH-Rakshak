"""Service layer for squad-level aggregation."""
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Squad, Soldier, FatigueAssessment, Alert, RiskCategory
from app.services.soldier_service import get_latest_fatigue, get_latest_reading, get_latest_features


async def get_all_squads(db: AsyncSession) -> List[dict]:
    result = await db.execute(select(Squad))
    squads = list(result.scalars().all())
    out = []
    for s in squads:
        c_res = await db.execute(
            select(func.count()).select_from(Soldier).where(Soldier.squad_id == s.id, Soldier.is_active == True)
        )
        count = c_res.scalar_one()
        out.append({
            "id": s.id,
            "name": s.name,
            "unit": s.unit,
            "commander_name": s.commander_name,
            "soldier_count": count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return out


async def get_squad_by_id(squad_id: int, db: AsyncSession) -> Optional[Squad]:
    result = await db.execute(select(Squad).where(Squad.id == squad_id))
    return result.scalar_one_or_none()


async def get_squad_soldiers(squad_id: int, db: AsyncSession) -> List[Soldier]:
    result = await db.execute(
        select(Soldier).where(Soldier.squad_id == squad_id, Soldier.is_active == True)
    )
    return list(result.scalars().all())


async def get_squad_status(squad_id: int, db: AsyncSession) -> dict:
    """
    Aggregates individual soldier states into squad-level summary.
    If squad_id is 0, aggregates across ALL active soldiers in the system.
    Returns: avg_fatigue, risk_distribution, highest_risk_soldier_id, active_alert_count
    """
    if squad_id == 0:
        from app.services.soldier_service import get_all_soldiers
        soldiers = await get_all_soldiers(db)
        squad_name = "All Personnel"
    else:
        soldiers = await get_squad_soldiers(squad_id, db)
        squad = await get_squad_by_id(squad_id, db)
        squad_name = squad.name if squad else "Unknown Squad"

    soldier_states = []
    fatigue_scores = []
    risk_dist = {"NORMAL": 0, "ELEVATED": 0, "HIGH": 0, "CRITICAL": 0}
    highest_risk_id = None
    highest_score = -1.0

    for soldier in soldiers:
        latest_fa = await get_latest_fatigue(soldier.id, db)
        latest_reading = await get_latest_reading(soldier.id, db)
        latest_pf = await get_latest_features(soldier.id, db)

        score = latest_fa.fatigue_score if latest_fa else 0.0
        category = latest_fa.risk_category.value if (latest_fa and hasattr(latest_fa.risk_category, 'value')) else (str(latest_fa.risk_category) if latest_fa else "NORMAL")
        fatigue_scores.append(score)
        risk_dist[category] = risk_dist.get(category, 0) + 1

        if score > highest_score:
            highest_score = score
            highest_risk_id = soldier.id

        mean_hr = None
        if latest_pf and latest_pf.mean_hr is not None:
            mean_hr = round(latest_pf.mean_hr, 1)
        elif latest_reading and latest_reading.rr_interval_ms and latest_reading.rr_interval_ms > 0:
            mean_hr = round(60000.0 / latest_reading.rr_interval_ms, 1)

        temperature = None
        if latest_pf and latest_pf.temperature is not None:
            temperature = round(latest_pf.temperature, 1)
        elif latest_reading and latest_reading.temperature_c is not None:
            temperature = round(latest_reading.temperature_c, 1)

        last_updated = (
            latest_fa.timestamp.isoformat() if latest_fa
            else (latest_reading.timestamp.isoformat() if latest_reading else None)
        )

        soldier_states.append({
            "soldier_id": soldier.id,
            "soldier_uid": soldier.soldier_uid,
            "name": soldier.name,
            "call_sign": soldier.call_sign,
            "rank": soldier.rank,
            "fatigue_score": score,
            "risk_category": category,
            "mean_hr": mean_hr,
            "temperature": temperature,
            "latest_fatigue": {
                "id": latest_fa.id,
                "soldier_id": latest_fa.soldier_id,
                "timestamp": latest_fa.timestamp.isoformat(),
                "fatigue_score": latest_fa.fatigue_score,
                "risk_category": category,
                "contributors": {
                    "hr_deviation": latest_fa.hr_deviation_score,
                    "hrv_deterioration": latest_fa.hrv_deterioration_score,
                    "activity_load": latest_fa.activity_load_score,
                    "temperature_trend": latest_fa.temperature_trend_score,
                },
                "model_version": latest_fa.model_version,
                "baseline_valid": latest_fa.baseline_valid,
            } if latest_fa else None,
            "latest_reading": {
                "id": latest_reading.id,
                "soldier_id": latest_reading.soldier_id,
                "timestamp": latest_reading.timestamp.isoformat(),
                "rr_interval_ms": latest_reading.rr_interval_ms,
                "temperature_c": latest_reading.temperature_c,
                "accel_x": latest_reading.accel_x,
                "accel_y": latest_reading.accel_y,
                "accel_z": latest_reading.accel_z,
                "activity_label": latest_reading.activity_label,
                "mission_id": latest_reading.mission_id,
                "source": latest_reading.source.value if hasattr(latest_reading.source, 'value') else str(latest_reading.source),
            } if latest_reading else None,
            "last_updated": last_updated,
        })

    # Count active (unacknowledged) alerts
    if squad_id == 0:
        alerts_result = await db.execute(select(Alert).where(Alert.is_acknowledged == False))
    else:
        alerts_result = await db.execute(
            select(Alert)
            .join(Soldier)
            .where(Soldier.squad_id == squad_id, Alert.is_acknowledged == False)
        )
    active_alerts = list(alerts_result.scalars().all())

    return {
        "squad_id": squad_id,
        "squad_name": squad_name,
        "total_soldiers": len(soldiers),
        "soldiers": soldier_states,
        "avg_fatigue_score": round(sum(fatigue_scores) / len(fatigue_scores), 2) if fatigue_scores else 0.0,
        "risk_distribution": risk_dist,
        "highest_risk_soldier_id": highest_risk_id,
        "active_alert_count": len(active_alerts),
    }


async def get_squad_alerts(squad_id: int, db: AsyncSession) -> List[Alert]:
    result = await db.execute(
        select(Alert)
        .join(Soldier)
        .where(Soldier.squad_id == squad_id, Alert.is_acknowledged == False)
        .order_by(Alert.timestamp.desc())
        .limit(100)
    )
    return list(result.scalars().all())

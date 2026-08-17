"""Service layer for analytics and historical queries."""
from typing import List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import FatigueAssessment, SensorReading, PhysiologicalFeatures, Alert, Soldier, Squad


async def get_system_summary(db: AsyncSession) -> dict:
    """High-level system summary: counts by risk category."""
    soldiers_result = await db.execute(
        select(Soldier).where(Soldier.is_active == True)
    )
    soldiers = list(soldiers_result.scalars().all())
    total = len(soldiers)

    # Get latest fatigue assessment per soldier
    counts = {"NORMAL": 0, "ELEVATED": 0, "HIGH": 0, "CRITICAL": 0}
    for s in soldiers:
        fa_result = await db.execute(
            select(FatigueAssessment)
            .where(FatigueAssessment.soldier_id == s.id)
            .order_by(desc(FatigueAssessment.timestamp))
            .limit(1)
        )
        fa = fa_result.scalar_one_or_none()
        if fa:
            cat = fa.risk_category.value if hasattr(fa.risk_category, 'value') else str(fa.risk_category)
            counts[cat] = counts.get(cat, 0) + 1
        else:
            counts["NORMAL"] += 1

    # Active alerts count
    alerts_result = await db.execute(
        select(func.count()).select_from(Alert)
        .where(Alert.is_acknowledged == False)
    )
    active_alerts = alerts_result.scalar_one()

    return {
        "total_soldiers": total,
        "normal_count": counts["NORMAL"],
        "elevated_count": counts["ELEVATED"],
        "high_count": counts["HIGH"],
        "critical_count": counts["CRITICAL"],
        "active_alert_count": active_alerts,
    }


async def get_squad_trend(squad_id: int, db: AsyncSession, hours: int = 6) -> dict:
    """Squad-level fatigue trend over the last N hours."""
    since = datetime.utcnow() - timedelta(hours=hours)

    soldiers_result = await db.execute(
        select(Soldier).where(Soldier.squad_id == squad_id, Soldier.is_active == True)
    )
    soldiers = list(soldiers_result.scalars().all())
    soldier_ids = [s.id for s in soldiers]

    if not soldier_ids:
        return {"squad_id": squad_id, "trend": []}

    fa_result = await db.execute(
        select(FatigueAssessment)
        .where(
            FatigueAssessment.soldier_id.in_(soldier_ids),
            FatigueAssessment.timestamp >= since
        )
        .order_by(FatigueAssessment.timestamp)
    )
    all_fa = list(fa_result.scalars().all())

    # Bucket by minute
    buckets: dict[str, list] = defaultdict(list)
    for fa in all_fa:
        bucket = fa.timestamp.strftime("%Y-%m-%dT%H:%M:00")
        buckets[bucket].append(fa.fatigue_score)

    trend = [
        {
            "timestamp": ts,
            "avg_fatigue": round(sum(scores) / len(scores), 2),
            "max_fatigue": round(max(scores), 2),
            "soldier_count": len(scores),
        }
        for ts, scores in sorted(buckets.items())
    ]

    return {"squad_id": squad_id, "hours": hours, "trend": trend}


async def get_soldier_history(soldier_id: int, db: AsyncSession, hours: int = 6) -> dict:
    """Per-soldier physiological + fatigue history over the last N hours."""
    since = datetime.utcnow() - timedelta(hours=hours)

    pf_result = await db.execute(
        select(PhysiologicalFeatures)
        .where(
            PhysiologicalFeatures.soldier_id == soldier_id,
            PhysiologicalFeatures.timestamp >= since
        )
        .order_by(PhysiologicalFeatures.timestamp)
    )
    pf_rows = list(pf_result.scalars().all())

    fa_result = await db.execute(
        select(FatigueAssessment)
        .where(
            FatigueAssessment.soldier_id == soldier_id,
            FatigueAssessment.timestamp >= since
        )
        .order_by(FatigueAssessment.timestamp)
    )
    fa_rows = list(fa_result.scalars().all())

    # Merge by timestamp — use fa as primary, join pf by nearest
    # Build pf lookup by minute
    pf_by_minute = {}
    for pf in pf_rows:
        key = pf.timestamp.strftime("%Y-%m-%dT%H:%M")
        pf_by_minute[key] = pf

    history = []
    for fa in fa_rows:
        key = fa.timestamp.strftime("%Y-%m-%dT%H:%M")
        pf = pf_by_minute.get(key)
        history.append({
            "timestamp": fa.timestamp.isoformat(),
            "fatigue_score": fa.fatigue_score,
            "risk_category": fa.risk_category.value if hasattr(fa.risk_category, 'value') else str(fa.risk_category),
            "mean_hr": pf.mean_hr if pf else None,
            "rmssd": pf.rmssd if pf else None,
            "sdnn": pf.sdnn if pf else None,
            "temperature": pf.temperature if pf else None,
            "activity_intensity": pf.activity_intensity if pf else None,
        })

    return {"soldier_id": soldier_id, "hours": hours, "history": history}


async def get_soldier_analytics(soldier_id: int, db: AsyncSession, limit: int = 300) -> dict:
    """Legacy: Individual soldier time-series analytics."""
    pf_result = await db.execute(
        select(PhysiologicalFeatures)
        .where(PhysiologicalFeatures.soldier_id == soldier_id)
        .order_by(PhysiologicalFeatures.timestamp)
        .limit(limit)
    )
    pf_rows = list(pf_result.scalars().all())

    fa_result = await db.execute(
        select(FatigueAssessment)
        .where(FatigueAssessment.soldier_id == soldier_id)
        .order_by(FatigueAssessment.timestamp)
        .limit(limit)
    )
    fa_rows = list(fa_result.scalars().all())

    return {
        "soldier_id": soldier_id,
        "hr_trend": [{"timestamp": r.timestamp.isoformat(), "value": r.mean_hr} for r in pf_rows],
        "hrv_trend": [{"timestamp": r.timestamp.isoformat(), "value": r.rmssd} for r in pf_rows],
        "temp_trend": [{"timestamp": r.timestamp.isoformat(), "value": r.temperature} for r in pf_rows],
        "activity_trend": [{"timestamp": r.timestamp.isoformat(), "value": r.activity_intensity} for r in pf_rows],
        "fatigue_trend": [{"timestamp": r.timestamp.isoformat(), "value": r.fatigue_score} for r in fa_rows],
    }


async def get_squad_analytics(squad_id: int, db: AsyncSession, limit: int = 300) -> dict:
    """Legacy: Squad-level aggregated analytics."""
    soldiers_result = await db.execute(
        select(Soldier).where(Soldier.squad_id == squad_id, Soldier.is_active == True)
    )
    soldiers = list(soldiers_result.scalars().all())
    soldier_ids = [s.id for s in soldiers]

    if not soldier_ids:
        return {"squad_id": squad_id, "avg_fatigue_trend": [], "high_risk_count_trend": []}

    fa_result = await db.execute(
        select(FatigueAssessment)
        .where(FatigueAssessment.soldier_id.in_(soldier_ids))
        .order_by(FatigueAssessment.timestamp)
        .limit(limit * len(soldier_ids))
    )
    all_fa = list(fa_result.scalars().all())

    buckets: dict[str, list] = defaultdict(list)
    for fa in all_fa:
        bucket = fa.timestamp.strftime("%Y-%m-%dT%H:%M")
        buckets[bucket].append(fa.fatigue_score)

    avg_trend = [
        {"timestamp": ts, "value": round(sum(scores) / len(scores), 2)}
        for ts, scores in sorted(buckets.items())
    ]

    return {"squad_id": squad_id, "avg_fatigue_trend": avg_trend}


async def get_mission_analytics(mission_id: int, db: AsyncSession) -> dict:
    """Mission-level fatigue analytics."""
    fa_result = await db.execute(
        select(FatigueAssessment)
        .where(FatigueAssessment.mission_id == mission_id)
        .order_by(FatigueAssessment.timestamp)
    )
    all_fa = list(fa_result.scalars().all())

    high_risk = [
        {"timestamp": fa.timestamp.isoformat(), "soldier_id": fa.soldier_id, "score": fa.fatigue_score}
        for fa in all_fa if fa.fatigue_score >= 55
    ]

    return {
        "mission_id": mission_id,
        "fatigue_progression": [
            {
                "timestamp": fa.timestamp.isoformat(),
                "soldier_id": fa.soldier_id,
                "fatigue_score": fa.fatigue_score,
                "risk_category": fa.risk_category.value if hasattr(fa.risk_category, 'value') else str(fa.risk_category),
            }
            for fa in all_fa
        ],
        "high_risk_periods": high_risk,
    }

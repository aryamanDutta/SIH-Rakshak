from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import soldier_service, alert_service

router = APIRouter()

@router.get("")
async def list_soldiers(db: AsyncSession = Depends(get_db)):
    soldiers = await soldier_service.get_all_soldiers(db)
    return [{"id": s.id, "soldier_uid": s.soldier_uid, "name": s.name,
             "call_sign": s.call_sign, "rank": s.rank, "squad_id": s.squad_id,
             "is_active": s.is_active} for s in soldiers]

@router.get("/alerts")
async def get_all_system_alerts(
    limit: int = Query(default=50, ge=1, le=500),
    active_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db)
):
    alerts = await alert_service.get_all_alerts(db, limit=limit, active_only=active_only)
    return [
        {
            "id": a.id,
            "soldier_id": a.soldier_id,
            "timestamp": a.timestamp.isoformat(),
            "alert_type": a.alert_type.value if hasattr(a.alert_type, 'value') else str(a.alert_type),
            "severity": a.severity.value if hasattr(a.severity, 'value') else str(a.severity),
            "message": a.message,
            "is_acknowledged": a.is_acknowledged,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "fatigue_score_at_alert": a.fatigue_score_at_alert,
            "status": "ACKNOWLEDGED" if a.is_acknowledged else "ACTIVE",
        }
        for a in alerts
    ]

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    alert = await alert_service.acknowledge_alert(alert_id, db)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "status": "acknowledged",
        "alert_id": alert.id,
        "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
    }

@router.get("/{soldier_id}")
async def get_soldier(soldier_id: int, db: AsyncSession = Depends(get_db)):
    soldier = await soldier_service.get_soldier_by_id(soldier_id, db)
    if not soldier:
        raise HTTPException(status_code=404, detail="Soldier not found")
    latest_fa = await soldier_service.get_latest_fatigue(soldier_id, db)
    latest_r = await soldier_service.get_latest_reading(soldier_id, db)
    return {
        "id": soldier.id,
        "soldier_uid": soldier.soldier_uid,
        "name": soldier.name,
        "call_sign": soldier.call_sign,
        "rank": soldier.rank,
        "squad_id": soldier.squad_id,
        "age": soldier.age,
        "weight_kg": soldier.weight_kg,
        "height_cm": soldier.height_cm,
        "latest_fatigue": {
            "fatigue_score": latest_fa.fatigue_score,
            "risk_category": latest_fa.risk_category.value if hasattr(latest_fa.risk_category, 'value') else str(latest_fa.risk_category),
            "timestamp": latest_fa.timestamp.isoformat(),
            "contributors": {
                "hr_deviation": latest_fa.hr_deviation_score,
                "hrv_deterioration": latest_fa.hrv_deterioration_score,
                "activity_load": latest_fa.activity_load_score,
                "temperature_trend": latest_fa.temperature_trend_score,
            },
        } if latest_fa else None,
        "latest_reading": {
            "rr_interval_ms": latest_r.rr_interval_ms,
            "temperature_c": latest_r.temperature_c,
            "activity_label": latest_r.activity_label,
            "timestamp": latest_r.timestamp.isoformat(),
        } if latest_r else None,
    }

@router.get("/{soldier_id}/readings")
async def get_soldier_readings(
    soldier_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    soldier = await soldier_service.get_soldier_by_id(soldier_id, db)
    if not soldier:
        raise HTTPException(status_code=404, detail="Soldier not found")
    return await soldier_service.get_soldier_readings(soldier_id, db, limit=limit)

@router.get("/{soldier_id}/history")
async def get_soldier_history(soldier_id: int, db: AsyncSession = Depends(get_db)):
    soldier = await soldier_service.get_soldier_by_id(soldier_id, db)
    if not soldier:
        raise HTTPException(status_code=404, detail="Soldier not found")
    history = await soldier_service.get_soldier_history(soldier_id, db)
    return {
        "soldier_id": soldier_id,
        "readings": [
            {"timestamp": r.timestamp.isoformat(), "rr_interval_ms": r.rr_interval_ms,
             "temperature_c": r.temperature_c, "activity_label": r.activity_label}
            for r in history["readings"]
        ],
        "fatigue_assessments": [
            {"timestamp": fa.timestamp.isoformat(), "fatigue_score": fa.fatigue_score,
             "risk_category": fa.risk_category.value if hasattr(fa.risk_category, 'value') else str(fa.risk_category)}
            for fa in history["fatigue_assessments"]
        ],
    }

@router.get("/{soldier_id}/baseline")
async def get_soldier_baseline(soldier_id: int, db: AsyncSession = Depends(get_db)):
    baseline = await soldier_service.get_soldier_baseline(soldier_id, db)
    if not baseline:
        raise HTTPException(status_code=404, detail="No baseline computed yet")
    return {
        "soldier_id": baseline.soldier_id,
        "baseline_hr_mean": baseline.baseline_hr_mean,
        "baseline_hr_std": baseline.baseline_hr_std,
        "baseline_hrv_mean": baseline.baseline_hrv_mean,
        "baseline_hrv_std": baseline.baseline_hrv_std,
        "baseline_temp_mean": baseline.baseline_temp_mean,
        "baseline_temp_std": baseline.baseline_temp_std,
        "sample_count": baseline.sample_count,
        "is_valid": baseline.is_valid,
        "computed_at": baseline.computed_at.isoformat(),
    }

@router.get("/{soldier_id}/fatigue")
async def get_soldier_fatigue(soldier_id: int, db: AsyncSession = Depends(get_db)):
    fa = await soldier_service.get_latest_fatigue(soldier_id, db)
    if not fa:
        raise HTTPException(status_code=404, detail="No fatigue assessment available")
    return {
        "soldier_id": fa.soldier_id,
        "timestamp": fa.timestamp.isoformat(),
        "fatigue_score": fa.fatigue_score,
        "risk_category": fa.risk_category.value if hasattr(fa.risk_category, 'value') else str(fa.risk_category),
        "contributors": {
            "hr_deviation": fa.hr_deviation_score,
            "hrv_deterioration": fa.hrv_deterioration_score,
            "activity_load": fa.activity_load_score,
            "temperature_trend": fa.temperature_trend_score,
        },
        "model_version": fa.model_version,
        "baseline_valid": fa.baseline_valid,
    }

@router.get("/{soldier_id}/alerts")
async def get_soldier_alerts(soldier_id: int, db: AsyncSession = Depends(get_db)):
    alerts = await soldier_service.get_soldier_alerts(soldier_id, db)
    return [
        {"id": a.id, "timestamp": a.timestamp.isoformat(), "alert_type": a.alert_type.value if hasattr(a.alert_type, 'value') else str(a.alert_type),
         "severity": a.severity.value if hasattr(a.severity, 'value') else str(a.severity), "message": a.message, "is_acknowledged": a.is_acknowledged,
         "fatigue_score_at_alert": a.fatigue_score_at_alert,
         "status": "ACKNOWLEDGED" if a.is_acknowledged else "ACTIVE"}
        for a in alerts
    ]

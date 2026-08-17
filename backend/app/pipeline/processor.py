"""
RAKSHAK Pipeline Processor

Connects the data ingestion layer to the processing, baseline, and AI layers.
This is the core integration point of the RAKSHAK processing pipeline.

Pipeline:
    SensorReading (from DB, most recent window)
        → FeatureExtractor (RR → HR/HRV features)
        → BaselineEngine (compute deviations)
        → HeuristicFatigueModel (fatigue score + contributors)
        → Save PhysiologicalFeatures, FatigueAssessment to DB
        → AlertService (check thresholds, create alerts if needed)
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import (
    SensorReading, PhysiologicalFeatures, PersonalBaseline,
    FatigueAssessment, RiskCategory
)
from app.processing.feature_extractor import FeatureExtractor
from app.baseline.baseline_engine import BaselineEngine
from app.ai.heuristic_model import HeuristicFatigueModel

# Module-level singletons: one per soldier, created on first use
# Keys are soldier_id (int)
_extractors: dict[int, FeatureExtractor] = {}
_baseline_engine = BaselineEngine(
    min_samples=settings.BASELINE_MIN_SAMPLES,
    rolling_alpha=settings.BASELINE_ROLLING_ALPHA,
)
_fatigue_model = HeuristicFatigueModel()


async def process_and_assess(soldier_id: int, db: AsyncSession, mission_id: Optional[int] = None) -> Optional[dict]:
    """
    Run the full processing pipeline for one soldier.
    
    Fetches the most recent window of sensor readings from the DB,
    extracts features, updates baseline, computes fatigue, persists results.
    
    Returns a summary dict with current fatigue state, or None if insufficient data.
    """
    window_size = settings.SIMULATION_RR_WINDOW_SIZE
    
    # 1. Fetch recent sensor readings
    stmt = (
        select(SensorReading)
        .where(SensorReading.soldier_id == soldier_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(window_size)
    )
    result = await db.execute(stmt)
    readings = list(reversed(result.scalars().all()))  # chronological order
    
    if len(readings) < 2:
        return None  # Not enough data yet
    
    # 2. Get or create per-soldier feature extractor
    if soldier_id not in _extractors:
        _extractors[soldier_id] = FeatureExtractor(window_size=window_size)
    extractor = _extractors[soldier_id]
    
    # 3. Extract features from RR intervals + temp + accel
    features = extractor.extract_from_readings_list(
        readings=readings,
        soldier_id=soldier_id,
        mission_id=mission_id,
    )
    if features is None or features.mean_hr == 0.0:
        return None
    
    # 4. Save PhysiologicalFeatures to DB
    pf = PhysiologicalFeatures(
        soldier_id=soldier_id,
        timestamp=features.timestamp if isinstance(features.timestamp, datetime) else datetime.fromisoformat(str(features.timestamp)),
        window_size=features.window_size,
        mean_hr=features.mean_hr,
        sdnn=features.sdnn,
        rmssd=features.rmssd,
        pnn50=features.pnn50,
        temperature=features.temperature,
        temperature_trend=features.temperature_trend,
        activity_intensity=features.activity_intensity,
        activity_label=features.activity_label,
        hr_change=features.hr_change,
        hrv_change=features.hrv_change,
        recovery_indicator=features.recovery_indicator,
        mission_id=mission_id,
    )
    db.add(pf)
    
    # 5. Update personal baseline
    snapshot = _baseline_engine.update_from_features(soldier_id, features)
    
    # Persist baseline to DB (upsert)
    existing_bl = await db.execute(
        select(PersonalBaseline).where(PersonalBaseline.soldier_id == soldier_id)
    )
    bl_record = existing_bl.scalar_one_or_none()
    bl_dict = _baseline_engine.snapshot_to_db_dict(snapshot)
    if bl_record is None:
        bl_record = PersonalBaseline(**bl_dict)
        db.add(bl_record)
    else:
        for k, v in bl_dict.items():
            setattr(bl_record, k, v)
    
    # 6. Compute deviations
    deviations = _baseline_engine.compute_deviations(features, snapshot)
    baseline_valid = deviations.pop("baseline_valid", snapshot.is_valid)
    
    # 7. Run fatigue model
    result = _fatigue_model.predict(
        features=features,
        deviations=deviations,
        baseline_valid=baseline_valid,
        mission_id=mission_id,
    )
    
    # 8. Save FatigueAssessment to DB
    fa = FatigueAssessment(
        soldier_id=soldier_id,
        timestamp=result.timestamp if isinstance(result.timestamp, datetime) else datetime.utcnow(),
        fatigue_score=result.fatigue_score,
        risk_category=RiskCategory(result.risk_category),
        hr_deviation_score=result.contributors.get("hr_deviation", 0.0),
        hrv_deterioration_score=result.contributors.get("hrv_deterioration", 0.0),
        activity_load_score=result.contributors.get("activity_load", 0.0),
        temperature_trend_score=result.contributors.get("temperature_trend", 0.0),
        model_version=result.model_version,
        mission_id=mission_id,
        activity_context=result.activity_context,
        baseline_valid=result.baseline_valid,
    )
    db.add(fa)
    await db.commit()
    
    # 9. Check alerts (import here to avoid circular)
    from app.services.alert_service import check_and_create_alert
    await check_and_create_alert(soldier_id=soldier_id, fatigue_result=result, db=db, mission_id=mission_id)
    
    return {
        "soldier_id": soldier_id,
        "fatigue_score": result.fatigue_score,
        "risk_category": result.risk_category,
        "contributors": result.contributors,
        "mean_hr": features.mean_hr,
        "rmssd": features.rmssd,
        "temperature": features.temperature,
    }

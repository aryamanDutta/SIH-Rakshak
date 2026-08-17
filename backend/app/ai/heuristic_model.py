"""
RAKSHAK Heuristic Fatigue Model

This is the CURRENT implementation of the fatigue engine.

Approach:
    Uses weighted combination of normalized physiological deviations.
    Weights are configurable via settings.FATIGUE_WEIGHTS.
    
    fatigue_score = clip(
        100 * (
            w_hr * f(hr_deviation) +
            w_hrv * f(hrv_deterioration) +
            w_act * activity_load +
            w_temp * f(temp_trend)
        ),
        0, 100
    )
    
    Where f() is a sigmoid-like saturation function that:
    - Maps raw deviations (which can be large z-scores) to [0, 1]
    - Provides smooth, bounded contributor scores
    - Is more sensitive in the physiologically relevant range

Mission context adjustment:
    If activity_context is HIGH_ACTIVITY or RUN, we reduce the raw score
    by a context factor (elevated HR during running is expected).
    This prevents false HIGH/CRITICAL alerts during normal intense exercise.

Weights (default, configurable):
    hr_deviation:    0.30
    hrv_deterioration: 0.35  (HRV is the strongest fatigue marker)
    activity_load:   0.25
    temperature_trend: 0.10

DISCLAIMER:
    This is a HEURISTIC PROTOTYPE. Weights are not empirically validated.
    This model is NOT a clinically validated fatigue diagnostic system.
    Do not use for medical decisions.
"""
import numpy as np
from datetime import datetime
from typing import Optional
import math

from app.ai.interface import FatigueModel, FatigueResult, RiskCategory
from app.config import settings

# Activity labels considered high-intensity (used for context adjustment)
HIGH_INTENSITY_LABELS = {"HIGH_ACTIVITY", "RUN", "SPRINT"}
CONTEXT_ADJUSTMENT_FACTOR = 0.85  # Reduce score by 15% during confirmed high-intensity activity


class HeuristicFatigueModel(FatigueModel):
    @property
    def model_version(self) -> str:
        return "heuristic-v1"
        
    def _saturation(self, z_score: float) -> float:
        val = (2.0 / (1.0 + math.exp(-z_score * 0.7))) - 1.0
        return float(np.clip(val, 0.0, 1.0))

    def predict(self, features, deviations: dict, baseline_valid: bool, mission_id: Optional[int] = None) -> FatigueResult:
        if not baseline_valid:
            fallback_hr_dev = (features.mean_hr - 80.0) / 20.0
            fallback_hrv_dev = (40.0 - features.rmssd) / 15.0
            fallback_temp_dev = (features.temperature - 37.0) / 0.5
            hr_dev = fallback_hr_dev
            hrv_dev = fallback_hrv_dev
            temp_dev = fallback_temp_dev
        else:
            hr_dev = deviations.get("hr_deviation", 0.0)
            hrv_dev = deviations.get("hrv_deviation", 0.0)
            temp_dev = deviations.get("temp_deviation", 0.0)

        hr_score = self._saturation(hr_dev)
        hrv_score = self._saturation(hrv_dev)
        temp_score = self._saturation(temp_dev)
        activity_score = getattr(features, "activity_intensity", 0.0)

        weights = getattr(settings, "FATIGUE_WEIGHTS", {
            "hr_deviation": 0.30,
            "hrv_deterioration": 0.35,
            "activity_load": 0.25,
            "temperature_trend": 0.10
        })
        
        raw_score = (
            weights["hr_deviation"] * hr_score +
            weights["hrv_deterioration"] * hrv_score +
            weights["activity_load"] * activity_score +
            weights["temperature_trend"] * temp_score
        )

        fatigue_score = float(np.clip(raw_score * 100.0, 0.0, 100.0))

        activity_label = getattr(features, "activity_label", "")
        if activity_label in HIGH_INTENSITY_LABELS:
            adjusted = (
                weights["hr_deviation"] * hr_score * CONTEXT_ADJUSTMENT_FACTOR +
                weights["hrv_deterioration"] * hrv_score +
                weights["activity_load"] * activity_score * CONTEXT_ADJUSTMENT_FACTOR +
                weights["temperature_trend"] * temp_score
            )
            fatigue_score = float(np.clip(adjusted * 100.0, 0.0, 100.0))

        risk_category = self.score_to_category(fatigue_score)
        
        return FatigueResult(
            soldier_id=features.soldier_id,
            timestamp=features.timestamp,
            fatigue_score=round(fatigue_score, 2),
            risk_category=risk_category,
            contributors={
                "hr_deviation": round(hr_score, 4),
                "hrv_deterioration": round(hrv_score, 4),
                "activity_load": round(activity_score, 4),
                "temperature_trend": round(temp_score, 4),
            },
            model_version=self.model_version,
            baseline_valid=baseline_valid,
            activity_context=activity_label or None,
            mission_id=mission_id,
        )

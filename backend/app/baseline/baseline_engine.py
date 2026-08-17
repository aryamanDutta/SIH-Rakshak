"""
RAKSHAK Personal Baseline Engine

Maintains individualized physiological baselines for each soldier.
Uses exponential moving average (EMA) to incrementally update baselines
from new physiological feature observations.

Why individualized baselines?
    Different soldiers have different resting HR, HRV, and temperature.
    Using universal thresholds would generate false alarms for naturally
    high-HR soldiers and miss warnings for naturally low-HR soldiers.
    By comparing each soldier against their own baseline, we get
    soldier-specific deviation signals rather than population-level ones.

Deviation calculation:
    z_score = (current_value - baseline_mean) / max(baseline_std, min_std_floor)
    
    The min_std_floor prevents division-by-zero and instability for
    very consistent soldiers (no real person has exactly zero HR variability).

Baseline validity:
    A baseline is considered 'valid' once it has accumulated at least
    BASELINE_MIN_SAMPLES observations. Before validity, the fatigue engine
    uses conservative universal fallback thresholds.
"""
import numpy as np
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass
from collections import deque

# Minimum std floor to prevent division-by-zero in z-score
HR_STD_FLOOR = 3.0     # bpm
HRV_STD_FLOOR = 2.0    # ms (RMSSD)
TEMP_STD_FLOOR = 0.1   # °C

@dataclass
class BaselineSnapshot:
    """Computed baseline values for a single soldier."""
    soldier_id: int
    baseline_hr_mean: float
    baseline_hr_std: float
    baseline_hrv_mean: float   # RMSSD mean
    baseline_hrv_std: float
    baseline_temp_mean: float
    baseline_temp_std: float
    sample_count: int
    is_valid: bool
    computed_at: datetime


class BaselineEngine:
    def __init__(self, min_samples: int, rolling_alpha: float):
        self.min_samples = min_samples
        self.rolling_alpha = rolling_alpha
        self._soldier_observations: dict[int, dict] = {}
        
    def update_from_features(self, soldier_id: int, features) -> BaselineSnapshot:
        if soldier_id not in self._soldier_observations:
            self._soldier_observations[soldier_id] = {
                "hr_values": deque(maxlen=500),
                "hrv_values": deque(maxlen=500),
                "temp_values": deque(maxlen=500)
            }
            
        obs = self._soldier_observations[soldier_id]
        obs["hr_values"].append(features.mean_hr)
        obs["hrv_values"].append(features.rmssd)
        obs["temp_values"].append(features.temperature)
        
        sample_count = len(obs["hr_values"])
        
        if sample_count < self.min_samples:
            hr_mean = np.mean(obs["hr_values"])
            hr_std = np.std(obs["hr_values"])
            hrv_mean = np.mean(obs["hrv_values"])
            hrv_std = np.std(obs["hrv_values"])
            temp_mean = np.mean(obs["temp_values"])
            temp_std = np.std(obs["temp_values"])
        else:
            recent_hr = list(obs["hr_values"])[-100:]
            recent_hrv = list(obs["hrv_values"])[-100:]
            recent_temp = list(obs["temp_values"])[-100:]
            
            hr_mean = np.mean(recent_hr)
            hr_std = np.std(recent_hr)
            hrv_mean = np.mean(recent_hrv)
            hrv_std = np.std(recent_hrv)
            temp_mean = np.mean(recent_temp)
            temp_std = np.std(recent_temp)

        snapshot = BaselineSnapshot(
            soldier_id=soldier_id,
            baseline_hr_mean=float(hr_mean),
            baseline_hr_std=float(hr_std),
            baseline_hrv_mean=float(hrv_mean),
            baseline_hrv_std=float(hrv_std),
            baseline_temp_mean=float(temp_mean),
            baseline_temp_std=float(temp_std),
            sample_count=sample_count,
            is_valid=(sample_count >= self.min_samples),
            computed_at=datetime.now(timezone.utc)
        )
        return snapshot
        
    def compute_deviations(self, features, baseline: BaselineSnapshot) -> dict:
        hr_deviation = (features.mean_hr - baseline.baseline_hr_mean) / max(baseline.baseline_hr_std, HR_STD_FLOOR)
        hrv_deviation = (baseline.baseline_hrv_mean - features.rmssd) / max(baseline.baseline_hrv_std, HRV_STD_FLOOR)
        temp_deviation = (features.temperature - baseline.baseline_temp_mean) / max(baseline.baseline_temp_std, TEMP_STD_FLOOR)
        
        return {
            "hr_deviation": float(hr_deviation),
            "hrv_deviation": float(hrv_deviation),
            "temp_deviation": float(temp_deviation),
            "baseline_valid": baseline.is_valid
        }
        
    def get_or_initialize_baseline(self, soldier_id: int, initial_hr: float = 75.0, initial_hrv: float = 40.0, initial_temp: float = 36.8) -> BaselineSnapshot:
        return BaselineSnapshot(
            soldier_id=soldier_id,
            baseline_hr_mean=initial_hr,
            baseline_hr_std=HR_STD_FLOOR,
            baseline_hrv_mean=initial_hrv,
            baseline_hrv_std=HRV_STD_FLOOR,
            baseline_temp_mean=initial_temp,
            baseline_temp_std=TEMP_STD_FLOOR,
            sample_count=0,
            is_valid=False,
            computed_at=datetime.now(timezone.utc)
        )
        
    def baseline_from_db_model(self, db_baseline) -> BaselineSnapshot:
        if db_baseline is None:
            raise ValueError("db_baseline cannot be None")
        return BaselineSnapshot(
            soldier_id=db_baseline.soldier_id,
            baseline_hr_mean=getattr(db_baseline, "baseline_hr_mean", 75.0) or 75.0,
            baseline_hr_std=getattr(db_baseline, "baseline_hr_std", HR_STD_FLOOR) or HR_STD_FLOOR,
            baseline_hrv_mean=getattr(db_baseline, "baseline_hrv_mean", 40.0) or 40.0,
            baseline_hrv_std=getattr(db_baseline, "baseline_hrv_std", HRV_STD_FLOOR) or HRV_STD_FLOOR,
            baseline_temp_mean=getattr(db_baseline, "baseline_temp_mean", 36.8) or 36.8,
            baseline_temp_std=getattr(db_baseline, "baseline_temp_std", TEMP_STD_FLOOR) or TEMP_STD_FLOOR,
            sample_count=getattr(db_baseline, "sample_count", 0) or 0,
            is_valid=getattr(db_baseline, "is_valid", False) or False,
            computed_at=getattr(db_baseline, "computed_at", datetime.now(timezone.utc))
        )
        
    def snapshot_to_db_dict(self, snapshot: BaselineSnapshot) -> dict:
        return {
            "soldier_id": snapshot.soldier_id,
            "baseline_hr_mean": snapshot.baseline_hr_mean,
            "baseline_hr_std": snapshot.baseline_hr_std,
            "baseline_hrv_mean": snapshot.baseline_hrv_mean,
            "baseline_hrv_std": snapshot.baseline_hrv_std,
            "baseline_temp_mean": snapshot.baseline_temp_mean,
            "baseline_temp_std": snapshot.baseline_temp_std,
            "sample_count": snapshot.sample_count,
            "is_valid": snapshot.is_valid,
            "computed_at": snapshot.computed_at
        }

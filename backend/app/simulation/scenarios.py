"""
Scenario definitions for the RAKSHAK sensor simulator.

Each scenario describes target physiological parameters and drift rates.
The simulator uses these to generate temporally coherent, correlated signals.

SCENARIOS dict: scenario_name -> ScenarioParams
"""
from dataclasses import dataclass
from typing import Dict

@dataclass
class ScenarioParams:
    name: str
    description: str
    # RR interval targets (ms) — HR is derived from RR
    # RR = 60000 / HR_bpm, so higher RR = lower HR
    rr_target_ms: float        # target mean RR interval
    rr_noise_std: float        # beat-to-beat variation (realistic HRV component)
    rr_drift_rate: float       # how fast RR drifts toward target per tick (0–1)
    # Temperature targets (°C)
    temp_target_c: float
    temp_noise_std: float
    temp_drift_rate: float
    # Accelerometer (activity) parameters
    accel_rms_target: float    # target RMS of accel vector (g) — 0.02=rest, 0.3=walk, 1.0=run
    accel_noise_std: float
    activity_label: str        # REST, WALK, PATROL, RUN, HIGH_ACTIVITY, RECOVERY

SCENARIOS: Dict[str, ScenarioParams] = {
    "REST": ScenarioParams(
        name="REST",
        description="Resting state, sitting or sleeping",
        rr_target_ms=900.0,
        rr_noise_std=30.0,
        rr_drift_rate=0.05,
        temp_target_c=36.8,
        temp_noise_std=0.05,
        temp_drift_rate=0.02,
        accel_rms_target=0.02,
        accel_noise_std=0.01,
        activity_label="REST"
    ),
    "PATROL": ScenarioParams(
        name="PATROL",
        description="Light patrolling activity",
        rr_target_ms=750.0,
        rr_noise_std=20.0,
        rr_drift_rate=0.04,
        temp_target_c=37.2,
        temp_noise_std=0.07,
        temp_drift_rate=0.03,
        accel_rms_target=0.25,
        accel_noise_std=0.05,
        activity_label="PATROL"
    ),
    "MODERATE_EXERTION": ScenarioParams(
        name="MODERATE_EXERTION",
        description="Moderate walking or exertion",
        rr_target_ms=600.0,
        rr_noise_std=15.0,
        rr_drift_rate=0.06,
        temp_target_c=37.6,
        temp_noise_std=0.08,
        temp_drift_rate=0.04,
        accel_rms_target=0.55,
        accel_noise_std=0.10,
        activity_label="WALK"
    ),
    "HIGH_INTENSITY": ScenarioParams(
        name="HIGH_INTENSITY",
        description="High intensity activity or combat",
        rr_target_ms=400.0,
        rr_noise_std=10.0,
        rr_drift_rate=0.08,
        temp_target_c=38.2,
        temp_noise_std=0.10,
        temp_drift_rate=0.05,
        accel_rms_target=1.20,
        accel_noise_std=0.20,
        activity_label="HIGH_ACTIVITY"
    ),
    "LONG_DURATION": ScenarioParams(
        name="LONG_DURATION",
        description="Progressive fatigue over long patrol",
        rr_target_ms=700.0,
        rr_noise_std=18.0,
        rr_drift_rate=0.03,
        temp_target_c=37.4,
        temp_noise_std=0.08,
        temp_drift_rate=0.02,
        accel_rms_target=0.20,
        accel_noise_std=0.05,
        activity_label="PATROL"
    ),
    "RECOVERY": ScenarioParams(
        name="RECOVERY",
        description="Recovery phase after exertion",
        rr_target_ms=850.0,
        rr_noise_std=35.0,
        rr_drift_rate=0.04,
        temp_target_c=36.9,
        temp_noise_std=0.06,
        temp_drift_rate=0.03,
        accel_rms_target=0.05,
        accel_noise_std=0.02,
        activity_label="RECOVERY"
    )
}

DEFAULT_SCENARIO = "PATROL"

"""
RAKSHAK Feature Extractor

Computes physiological features from a window of cleaned RR intervals
and associated sensor readings.

Features computed:
    Cardiac:
        mean_hr    — mean heart rate (bpm), derived from mean RR interval
        sdnn       — standard deviation of NN (RR) intervals (ms)
                     reflects overall HRV; higher = healthier cardiac regulation
        rmssd      — root mean square of successive differences (ms)
                     reflects parasympathetic tone; decreases with fatigue
        pnn50      — % of successive RR diffs > 50ms
                     sensitive marker of parasympathetic activity
    
    Temperature:
        temperature       — current reading (°C)
        temperature_trend — linear slope of temperature over window (°C/min)
                            positive trend indicates heat accumulation
    
    Activity:
        activity_intensity — normalized RMS of accelerometer (0–1 scale)
        activity_label     — current activity string
    
    Derived change indicators (requires previous window):
        hr_change          — delta mean_hr vs previous window
        hrv_change         — delta rmssd vs previous window
        recovery_indicator — 0.0 (no recovery) to 1.0 (strong recovery)
                             computed from HR trending down + RMSSD trending up

Mathematical definitions:
    mean_hr = 60000 / mean(RR_ms)
    SDNN = std(RR_ms)  [population std, ddof=0]
    RMSSD = sqrt(mean(diff(RR_ms)^2))
    pNN50 = 100 * count(|diff(RR_ms)| > 50) / (len(RR_ms) - 1)

DISCLAIMER: These are standard HRV analysis formulas per international guidelines
(Task Force of ESC/NASPE, 1996). They are used here for research/prototype fatigue
estimation, not clinical diagnosis.
"""
import numpy as np
from typing import List, Optional
from dataclasses import dataclass, field
from datetime import datetime

from .signal_processor import SignalProcessor

@dataclass
class ExtractedFeatures:
    """Container for all features extracted from a sensor data window."""
    timestamp: datetime
    soldier_id: int
    window_size: int
    # Cardiac
    mean_hr: float
    sdnn: float
    rmssd: float
    pnn50: float
    # Temperature
    temperature: float
    temperature_trend: float    # °C/min, positive = warming
    # Activity
    activity_intensity: float   # 0.0 (rest) to 1.0 (max activity)
    activity_label: str
    # Change indicators (None if no previous window)
    hr_change: Optional[float] = None
    hrv_change: Optional[float] = None
    recovery_indicator: Optional[float] = None
    mission_id: Optional[int] = None


class FeatureExtractor:
    def __init__(self, window_size: int = 20):
        self.window_size = window_size
        self._prev_features: Optional[ExtractedFeatures] = None
        self._processor = SignalProcessor()

    def extract(self, rr_intervals: List[float], temperatures: List[float], accels: List[tuple], soldier_id: int, timestamp: datetime, activity_label: str, mission_id: Optional[int] = None) -> ExtractedFeatures:
        # 1. Clean RR intervals
        clean_rr, artifact_count = self._processor.clean_rr_intervals(rr_intervals)

        # 2. Need at least 2 valid RR intervals
        if len(clean_rr) < 2:
            features = ExtractedFeatures(
                timestamp=timestamp,
                soldier_id=soldier_id,
                window_size=self.window_size,
                mean_hr=0.0,
                sdnn=0.0,
                rmssd=0.0,
                pnn50=0.0,
                temperature=37.0,
                temperature_trend=0.0,
                activity_intensity=0.0,
                activity_label=activity_label,
                mission_id=mission_id
            )
            self._prev_features = features
            return features

        # 3. Mean HR
        mean_rr = float(np.mean(clean_rr))
        mean_hr = 60000.0 / mean_rr if mean_rr > 0 else 0.0

        # 4. SDNN
        sdnn = float(np.std(clean_rr, ddof=0))

        # 5. RMSSD
        diffs = np.diff(clean_rr)
        rmssd = float(np.sqrt(np.mean(diffs ** 2))) if len(diffs) > 0 else 0.0

        # 6. pNN50
        pnn50 = float(np.sum(np.abs(diffs) > 50.0) / len(diffs) * 100.0) if len(diffs) > 0 else 0.0

        # 7. Temperature
        if len(temperatures) >= 5:
            current_temp = float(np.mean(temperatures[-5:]))
        elif len(temperatures) > 0:
            current_temp = float(temperatures[-1])
        else:
            current_temp = 37.0

        if len(temperatures) >= 2:
            # Linear regression slope in °C/min (assuming 1 reading per second → 60x scale)
            x = np.arange(len(temperatures), dtype=float)
            slope_per_sample = float(np.polyfit(x, temperatures, 1)[0])
            temp_trend = slope_per_sample * 60.0  # convert to °C/min
        else:
            temp_trend = 0.0

        # 8. Activity intensity
        if accels:
            rms_values = [self._processor.compute_accel_rms(a[0], a[1], a[2]) for a in accels]
            raw_intensity = float(np.mean(rms_values))
            # Normalize: 0=rest (rms≈0), 1=max (rms≈2.0g)
            activity_intensity = float(np.clip(raw_intensity / 2.0, 0.0, 1.0))
        else:
            activity_intensity = 0.0

        # 9. Change indicators
        hr_change = None
        hrv_change = None
        recovery_indicator = None
        if self._prev_features is not None:
            hr_change = mean_hr - self._prev_features.mean_hr
            hrv_change = rmssd - self._prev_features.rmssd
            # Recovery: HR going down AND HRV (RMSSD) going up = recovery
            hr_norm = float(np.clip(-hr_change / 20.0, -1.0, 1.0))  # normalize by 20bpm
            hrv_norm = float(np.clip(hrv_change / 10.0, -1.0, 1.0))  # normalize by 10ms
            recovery_indicator = float(np.clip((hr_norm + hrv_norm) / 2.0, 0.0, 1.0))

        features = ExtractedFeatures(
            timestamp=timestamp,
            soldier_id=soldier_id,
            window_size=self.window_size,
            mean_hr=mean_hr,
            sdnn=sdnn,
            rmssd=rmssd,
            pnn50=pnn50,
            temperature=current_temp,
            temperature_trend=temp_trend,
            activity_intensity=activity_intensity,
            activity_label=activity_label,
            hr_change=hr_change,
            hrv_change=hrv_change,
            recovery_indicator=recovery_indicator,
            mission_id=mission_id
        )
        
        self._prev_features = features
        return features

    def extract_from_readings_list(self, readings: list, soldier_id: int, mission_id: Optional[int] = None) -> Optional[ExtractedFeatures]:
        if not readings:
            return None
            
        rr_intervals = []
        temperatures = []
        accels = []
        
        # Keep track of last valid reading for timestamp/label
        last_timestamp = None
        last_label = 'unknown'
        
        for r in readings:
            # Handle dicts (e.g. from simulator output)
            if isinstance(r, dict):
                # Primary field name is rr_interval_ms (matches SensorReading schema)
                rr_val = r.get('rr_interval_ms')
                if rr_val is not None:
                    rr_intervals.append(float(rr_val))
                # Temperature field is temperature_c (matches SensorReading schema)
                temp_val = r.get('temperature_c')
                if temp_val is not None:
                    temperatures.append(float(temp_val))

                accel_x = r.get('accel_x', 0.0)
                accel_y = r.get('accel_y', 0.0)
                accel_z = r.get('accel_z', 9.81)
                accels.append((float(accel_x), float(accel_y), float(accel_z)))

                if 'timestamp' in r:
                    last_timestamp = r['timestamp']
                if 'activity_label' in r:
                    last_label = r['activity_label']
            # Handle ORM objects (SensorReading instances from DB)
            else:
                rr_val = getattr(r, 'rr_interval_ms', None)
                if rr_val is not None:
                    rr_intervals.append(float(rr_val))
                temp_val = getattr(r, 'temperature_c', None)
                if temp_val is not None:
                    temperatures.append(float(temp_val))

                accel_x = getattr(r, 'accel_x', 0.0)
                accel_y = getattr(r, 'accel_y', 0.0)
                accel_z = getattr(r, 'accel_z', 9.81)
                accels.append((float(accel_x), float(accel_y), float(accel_z)))

                if hasattr(r, 'timestamp'):
                    last_timestamp = getattr(r, 'timestamp')
                if hasattr(r, 'activity_label'):
                    last_label = getattr(r, 'activity_label')
                
        if not last_timestamp:
            last_timestamp = datetime.utcnow()
            
        return self.extract(
            rr_intervals=rr_intervals,
            temperatures=temperatures,
            accels=accels,
            soldier_id=soldier_id,
            timestamp=last_timestamp,
            activity_label=last_label,
            mission_id=mission_id
        )

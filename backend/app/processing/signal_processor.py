"""
RAKSHAK Signal Processor

Cleans and validates raw RR interval sequences before feature extraction.
Applies artifact detection and basic filtering.

Physiological basis:
    A 'normal' RR interval range for a human is approximately 330ms–1200ms
    (corresponding to HR range of 50–182 bpm).
    Successive RR intervals should not differ by more than ~20% in normal sinus rhythm.
    Readings outside these bounds are likely artifacts.

DISCLAIMER: This processing is suitable for prototype fatigue estimation.
It is NOT a clinical-grade ECG processing pipeline (e.g., not equivalent to
medical-grade Pan-Tompkins or similar algorithms).
"""
import numpy as np
from typing import List, Tuple

RR_MIN_MS = 330.0   # ~182 bpm — absolute minimum physiological RR
RR_MAX_MS = 1500.0  # ~40 bpm — absolute maximum (resting, relaxed)
RR_SUCCESSIVE_DIFF_THRESHOLD = 0.25  # flag if successive RR differ by > 25%
TEMP_MIN_C = 35.0
TEMP_MAX_C = 40.5

class SignalProcessor:
    """
    Processes raw RR interval sequences for feature extraction.
    
    Usage:
        processor = SignalProcessor()
        clean_rr, artifact_count = processor.clean_rr_intervals(raw_rr_list)
        artifact_ratio = artifact_count / len(raw_rr_list)
    """

    def clean_rr_intervals(self, rr_intervals: List[float]) -> Tuple[np.ndarray, int]:
        """
        Cleans raw RR intervals by removing physiological outliers and artifacts.
        """
        if len(rr_intervals) < 3:
            return np.array(rr_intervals), 0
            
        clean = []
        artifact_count = 0
        
        for i, rr in enumerate(rr_intervals):
            # Check absolute bounds
            if not (RR_MIN_MS <= rr <= RR_MAX_MS):
                artifact_count += 1
                continue
                
            # Check successive difference (if not first element)
            if clean:
                prev_rr = clean[-1]
                if abs(rr - prev_rr) > RR_SUCCESSIVE_DIFF_THRESHOLD * prev_rr:
                    artifact_count += 1
                    continue
                    
            clean.append(rr)
            
        # If less than 3 valid remain, we can't reliably use the cleaned version
        if len(clean) < 3:
            return np.array(rr_intervals), len(rr_intervals) - len(clean)
            
        return np.array(clean), artifact_count

    def validate_temperature(self, temp_c: float) -> Tuple[float, bool]:
        """
        Validates and clamps temperature readings.
        """
        is_valid = TEMP_MIN_C <= temp_c <= TEMP_MAX_C
        clamped_value = max(TEMP_MIN_C, min(temp_c, TEMP_MAX_C))
        return float(clamped_value), is_valid

    def compute_accel_rms(self, x: float, y: float, z: float, gravity: float = 9.81) -> float:
        """
        Computes the activity intensity (RMS of acceleration) with gravity removed.
        """
        z_corrected = z - gravity
        rms = np.sqrt((x**2 + y**2 + z_corrected**2) / 3.0)
        return float(np.clip(rms, 0.0, 3.0))

    def smooth_sequence(self, values: List[float], window: int = 3) -> np.ndarray:
        """
        Applies a simple centered moving average with edge handling.
        """
        if not values:
            return np.array([])
        
        arr = np.array(values)
        if len(arr) < window:
            return arr
            
        pad_size = window // 2
        padded = np.pad(arr, (pad_size, pad_size), mode='edge')
        smoothed = np.convolve(padded, np.ones(window)/window, mode='valid')
        
        return smoothed

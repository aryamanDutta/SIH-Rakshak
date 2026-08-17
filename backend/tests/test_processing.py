"""Tests for signal processing and feature extraction."""
import pytest
import numpy as np
from datetime import datetime
from app.processing.signal_processor import SignalProcessor
from app.processing.feature_extractor import FeatureExtractor, ExtractedFeatures


def test_clean_rr_removes_out_of_bounds():
    proc = SignalProcessor()
    rr = [700, 800, 900, 200, 1600, 750]  # 200 and 1600 should be removed
    clean, artifact_count = proc.clean_rr_intervals(rr)
    assert artifact_count >= 2
    assert all(330 <= v <= 1500 for v in clean)


def test_clean_rr_with_valid_data_unchanged():
    proc = SignalProcessor()
    rr = [750.0, 760.0, 740.0, 770.0, 755.0]
    clean, artifact_count = proc.clean_rr_intervals(rr)
    assert artifact_count == 0
    assert len(clean) == len(rr)


def test_compute_accel_rms_rest_is_near_zero():
    proc = SignalProcessor()
    # Rest: x≈0, y≈0, z≈9.81 (gravity dominant)
    rms = proc.compute_accel_rms(0.01, 0.01, 9.82)
    assert rms < 0.1  # Nearly zero movement after gravity removal


def test_feature_extraction_mean_hr():
    """Mean HR should equal 60000 / mean(RR)."""
    extractor = FeatureExtractor(window_size=10)
    rr = [800.0] * 10  # All 800ms → HR = 75 bpm
    temps = [37.0] * 10
    accels = [(0.0, 0.0, 9.81)] * 10
    features = extractor.extract(rr, temps, accels, soldier_id=1,
                                  timestamp=datetime.utcnow(), activity_label="REST")
    assert abs(features.mean_hr - 75.0) < 0.1


def test_feature_extraction_sdnn():
    """SDNN of constant RR intervals should be 0."""
    extractor = FeatureExtractor(window_size=10)
    rr = [800.0] * 10
    temps = [37.0] * 10
    accels = [(0.0, 0.0, 9.81)] * 10
    features = extractor.extract(rr, temps, accels, 1, datetime.utcnow(), "REST")
    assert features.sdnn == pytest.approx(0.0, abs=0.01)


def test_feature_extraction_rmssd():
    """RMSSD of constant RR intervals should be 0."""
    extractor = FeatureExtractor(window_size=10)
    rr = [800.0] * 10
    temps = [37.0] * 10
    accels = [(0.0, 0.0, 9.81)] * 10
    features = extractor.extract(rr, temps, accels, 1, datetime.utcnow(), "REST")
    assert features.rmssd == pytest.approx(0.0, abs=0.01)


def test_feature_extraction_pnn50_alternating():
    """All successive diffs > 50ms → pNN50 should be 100%."""
    extractor = FeatureExtractor(window_size=6)
    rr = [700.0, 800.0, 700.0, 800.0, 700.0, 800.0]  # diffs all = 100ms > 50ms
    temps = [37.0] * 6
    accels = [(0.0, 0.0, 9.81)] * 6
    features = extractor.extract(rr, temps, accels, 1, datetime.utcnow(), "REST")
    assert features.pnn50 == pytest.approx(100.0, abs=0.1)


def test_temperature_trend_positive_for_rising_temp():
    extractor = FeatureExtractor(window_size=10)
    rr = [800.0] * 10
    # Rising temperature over 10 samples
    temps = [36.8 + i * 0.01 for i in range(10)]
    accels = [(0.0, 0.0, 9.81)] * 10
    features = extractor.extract(rr, temps, accels, 1, datetime.utcnow(), "REST")
    assert features.temperature_trend > 0, "Rising temperature should give positive trend"


def test_from_readings_list_with_dicts():
    extractor = FeatureExtractor(window_size=5)
    readings = [
        {"rr_interval_ms": 800.0, "temperature_c": 37.0, "accel_x": 0.0,
         "accel_y": 0.0, "accel_z": 9.81, "timestamp": datetime.utcnow().isoformat(),
         "activity_label": "REST"}
        for _ in range(5)
    ]
    features = extractor.extract_from_readings_list(readings, soldier_id=1)
    assert features is not None
    assert abs(features.mean_hr - 75.0) < 0.1

"""Tests for the personal baseline engine."""
import pytest
from datetime import datetime
from app.baseline.baseline_engine import BaselineEngine, BaselineSnapshot
from app.processing.feature_extractor import ExtractedFeatures


def _make_features(mean_hr=75.0, rmssd=40.0, temperature=37.0, soldier_id=1):
    return ExtractedFeatures(
        timestamp=datetime.utcnow(),
        soldier_id=soldier_id,
        window_size=20,
        mean_hr=mean_hr,
        sdnn=15.0,
        rmssd=rmssd,
        pnn50=20.0,
        temperature=temperature,
        temperature_trend=0.0,
        activity_intensity=0.1,
        activity_label="REST",
    )


def test_baseline_initializes_correctly():
    engine = BaselineEngine(min_samples=30, rolling_alpha=0.1)
    snap = engine.get_or_initialize_baseline(soldier_id=1)
    assert snap.is_valid == False
    assert snap.sample_count == 0


def test_baseline_becomes_valid_after_min_samples():
    engine = BaselineEngine(min_samples=5, rolling_alpha=0.1)  # low threshold for test
    for i in range(5):
        snap = engine.update_from_features(1, _make_features())
    assert snap.is_valid == True
    assert snap.sample_count == 5


def test_baseline_tracks_mean_correctly():
    engine = BaselineEngine(min_samples=3, rolling_alpha=0.1)
    hr_values = [70.0, 80.0, 90.0]
    for hr in hr_values:
        snap = engine.update_from_features(1, _make_features(mean_hr=hr))
    assert abs(snap.baseline_hr_mean - 80.0) < 1.0  # should be close to mean of 70,80,90


def test_deviation_hr_above_baseline_is_positive():
    engine = BaselineEngine(min_samples=1, rolling_alpha=0.1)
    # Establish baseline at HR=70
    for _ in range(10):
        engine.update_from_features(1, _make_features(mean_hr=70.0))
    snap = engine.update_from_features(1, _make_features(mean_hr=70.0))
    # Current reading: HR=100 (above baseline)
    devs = engine.compute_deviations(_make_features(mean_hr=100.0), snap)
    assert devs["hr_deviation"] > 0, "HR above baseline should give positive deviation"


def test_deviation_hrv_below_baseline_is_positive():
    """HRV deviation is inverted: lower RMSSD than baseline → positive deviation."""
    engine = BaselineEngine(min_samples=1, rolling_alpha=0.1)
    for _ in range(10):
        engine.update_from_features(1, _make_features(rmssd=40.0))
    snap = engine.update_from_features(1, _make_features(rmssd=40.0))
    # Current RMSSD = 20 (lower than baseline 40 → fatigue indicator)
    devs = engine.compute_deviations(_make_features(rmssd=20.0), snap)
    assert devs["hrv_deviation"] > 0, "HRV below baseline should give positive deviation"


def test_different_soldiers_have_independent_baselines():
    engine = BaselineEngine(min_samples=1, rolling_alpha=0.1)
    engine.update_from_features(1, _make_features(mean_hr=60.0, soldier_id=1))
    engine.update_from_features(2, _make_features(mean_hr=90.0, soldier_id=2))
    snap1 = engine.update_from_features(1, _make_features(mean_hr=60.0, soldier_id=1))
    snap2 = engine.update_from_features(2, _make_features(mean_hr=90.0, soldier_id=2))
    assert abs(snap1.baseline_hr_mean - 60.0) < 2.0
    assert abs(snap2.baseline_hr_mean - 90.0) < 2.0

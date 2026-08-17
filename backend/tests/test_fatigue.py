"""Tests for the heuristic fatigue model."""
import pytest
from datetime import datetime
from app.ai.heuristic_model import HeuristicFatigueModel
from app.ai.interface import RiskCategory
from app.processing.feature_extractor import ExtractedFeatures


def _make_features(mean_hr=75.0, rmssd=40.0, activity_intensity=0.2,
                   temperature=37.0, activity_label="REST", soldier_id=1):
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
        activity_intensity=activity_intensity,
        activity_label=activity_label,
    )


def test_fatigue_score_in_valid_range():
    model = HeuristicFatigueModel()
    features = _make_features()
    result = model.predict(features=features, deviations={"hr_deviation": 1.0, "hrv_deviation": 1.0, "temp_deviation": 0.5}, baseline_valid=True)
    assert 0.0 <= result.fatigue_score <= 100.0


def test_normal_soldier_has_low_score():
    model = HeuristicFatigueModel()
    features = _make_features(mean_hr=70.0, rmssd=50.0, activity_intensity=0.1)
    result = model.predict(features=features, deviations={"hr_deviation": 0.0, "hrv_deviation": 0.0, "temp_deviation": 0.0}, baseline_valid=True)
    assert result.fatigue_score < 30.0, f"Normal soldier should have NORMAL score, got {result.fatigue_score}"
    assert result.risk_category == RiskCategory.NORMAL


def test_severely_fatigued_soldier_has_high_score():
    model = HeuristicFatigueModel()
    features = _make_features(mean_hr=155.0, rmssd=8.0, activity_intensity=0.9)
    result = model.predict(features=features, deviations={"hr_deviation": 4.0, "hrv_deviation": 5.0, "temp_deviation": 2.0}, baseline_valid=True)
    assert result.fatigue_score > 55.0, f"Fatigued soldier should have HIGH/CRITICAL score, got {result.fatigue_score}"


def test_contributors_dict_has_expected_keys():
    model = HeuristicFatigueModel()
    features = _make_features()
    result = model.predict(features=features, deviations={"hr_deviation": 1.0, "hrv_deviation": 1.0, "temp_deviation": 0.0}, baseline_valid=True)
    expected_keys = {"hr_deviation", "hrv_deterioration", "activity_load", "temperature_trend"}
    assert expected_keys.issubset(set(result.contributors.keys()))


def test_score_to_category_boundaries():
    model = HeuristicFatigueModel()
    assert model.score_to_category(15.0) == RiskCategory.NORMAL
    assert model.score_to_category(40.0) == RiskCategory.ELEVATED
    assert model.score_to_category(65.0) == RiskCategory.HIGH
    assert model.score_to_category(85.0) == RiskCategory.CRITICAL


def test_high_intensity_context_reduces_score():
    """During confirmed high-intensity activity, HR contribution should be reduced."""
    model = HeuristicFatigueModel()
    devs = {"hr_deviation": 3.0, "hrv_deviation": 0.5, "temp_deviation": 0.5}
    features_run = _make_features(mean_hr=155.0, activity_intensity=0.9, activity_label="HIGH_ACTIVITY")
    features_rest = _make_features(mean_hr=155.0, activity_intensity=0.9, activity_label="REST")
    result_run = model.predict(features=features_run, deviations=devs, baseline_valid=True)
    result_rest = model.predict(features=features_rest, deviations=devs, baseline_valid=True)
    assert result_run.fatigue_score < result_rest.fatigue_score, (
        "HIGH_ACTIVITY context should reduce score vs same readings at REST"
    )


def test_invalid_baseline_falls_back_gracefully():
    model = HeuristicFatigueModel()
    features = _make_features(mean_hr=85.0)
    result = model.predict(features=features, deviations={}, baseline_valid=False)
    assert 0.0 <= result.fatigue_score <= 100.0
    assert result.baseline_valid == False

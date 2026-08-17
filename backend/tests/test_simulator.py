"""Tests for the RAKSHAK sensor simulator."""
import pytest
from datetime import datetime
from app.simulation.simulator import SoldierSimulator, SimulationManager
from app.simulation.scenarios import SCENARIOS


def test_simulator_produces_dict_with_required_fields():
    sim = SoldierSimulator(soldier_id=1, soldier_index=0)
    result = sim.tick(datetime.utcnow())
    required = {"soldier_id", "timestamp", "rr_interval_ms", "temperature_c",
                "accel_x", "accel_y", "accel_z", "activity_label", "source"}
    assert required.issubset(set(result.keys())), f"Missing keys: {required - set(result.keys())}"


def test_rr_interval_within_physiological_bounds():
    sim = SoldierSimulator(soldier_id=1, soldier_index=0)
    for _ in range(100):
        r = sim.tick(datetime.utcnow())
        assert 330.0 <= r["rr_interval_ms"] <= 1200.0, f"RR out of range: {r['rr_interval_ms']}"


def test_temperature_within_physiological_bounds():
    sim = SoldierSimulator(soldier_id=1, soldier_index=0)
    for _ in range(100):
        r = sim.tick(datetime.utcnow())
        assert 35.0 <= r["temperature_c"] <= 40.5, f"Temp out of range: {r['temperature_c']}"


def test_different_soldiers_have_different_starting_rr():
    sim0 = SoldierSimulator(soldier_id=1, soldier_index=0)
    sim1 = SoldierSimulator(soldier_id=2, soldier_index=1)
    r0 = sim0.tick(datetime.utcnow())
    r1 = sim1.tick(datetime.utcnow())
    assert r0["rr_interval_ms"] != r1["rr_interval_ms"], "All soldiers should have different baseline RR"


def test_high_intensity_produces_lower_rr_than_rest():
    """After settling, HIGH_INTENSITY should have lower RR (higher HR) than REST."""
    sim_hi = SoldierSimulator(soldier_id=10, soldier_index=0)
    sim_hi.set_scenario("HIGH_INTENSITY")
    sim_rest = SoldierSimulator(soldier_id=11, soldier_index=0)
    sim_rest.set_scenario("REST")
    ts = datetime.utcnow()
    # Run enough ticks for scenarios to settle
    for _ in range(100):
        r_hi = sim_hi.tick(ts)
        r_rest = sim_rest.tick(ts)
    assert r_hi["rr_interval_ms"] < r_rest["rr_interval_ms"], (
        f"HIGH_INTENSITY RR ({r_hi['rr_interval_ms']}) should be less than REST RR ({r_rest['rr_interval_ms']})"
    )


def test_long_duration_scenario_shows_cumulative_hr_increase():
    sim = SoldierSimulator(soldier_id=99, soldier_index=0)
    sim.set_scenario("LONG_DURATION")
    ts = datetime.utcnow()
    early_rr_vals = [sim.tick(ts)["rr_interval_ms"] for _ in range(10)]
    # Fast-forward 200 ticks
    for _ in range(200):
        sim.tick(ts)
    late_rr_vals = [sim.tick(ts)["rr_interval_ms"] for _ in range(10)]
    # Later RR should be lower (higher HR due to cumulative fatigue)
    assert sum(late_rr_vals) < sum(early_rr_vals), "LONG_DURATION should show progressive HR increase"


def test_simulation_manager_start_stop():
    mgr = SimulationManager()
    mgr.start(soldier_ids=[1, 2, 3], scenario="PATROL")
    assert mgr.is_running
    assert set(mgr.simulators.keys()) == {1, 2, 3}
    mgr.stop()
    assert not mgr.is_running


def test_all_scenarios_exist():
    expected = {"REST", "PATROL", "MODERATE_EXERTION", "HIGH_INTENSITY", "LONG_DURATION", "RECOVERY"}
    assert expected.issubset(set(SCENARIOS.keys()))

"""
RAKSHAK Sensor Simulator

Generates realistic, temporally coherent physiological signals for multiple virtual soldiers.
This replaces physical ECG/IMU/temperature hardware during the software prototype phase.

Architecture note:
    Each SoldierSimulator instance maintains its own physiological state.
    Output format matches the normalized SensorReading schema exactly.
    To replace with real ESP32 data, swap SimulatorSource with ESP32Source in ingestion/.

Signals generated:
    - RR intervals (ms) — the primary cardiac measurement
      HR is DERIVED from RR, not simulated directly
    - Temperature (°C)
    - Accelerometer (g) in X, Y, Z axes

HRV note:
    A single RR interval is the raw measurement.
    HRV features (SDNN, RMSSD, pNN50) are computed by the signal processing layer
    from a WINDOW of RR intervals — not by this simulator.
    The simulator produces realistic beat-to-beat variation (realistic HRV-like noise)
    by using correlated noise (AR(1) process) rather than pure random noise.
"""
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

from app.simulation.scenarios import SCENARIOS, DEFAULT_SCENARIO, ScenarioParams

SIMULATION_TICK_RATE_HZ = 1.0  # Default tick rate, can be adjusted

class SoldierSimulator:
    """Simulates physiological signals for a single virtual soldier."""
    
    def __init__(self, soldier_id: int, soldier_index: int = 0):
        self.soldier_id = soldier_id
        self.soldier_index = soldier_index
        
        # Initialize state with slight variations based on soldier index
        self.current_rr_ms = 820.0 - (20.0 * soldier_index)
        self.current_temp_c = 36.8 + ((soldier_index % 3) - 1) * 0.3
        self.current_accel = (0.0, 0.0, 9.81)
        
        self.current_scenario: ScenarioParams = SCENARIOS[DEFAULT_SCENARIO]
        self.tick_count = 0
        
        # Reproducible random generator based on soldier_id
        self.rng = np.random.default_rng(seed=soldier_id)
        
        # AR(1) correlated noise states
        self.rr_noise_state = 0.0
        self.temp_noise_state = 0.0

    def set_scenario(self, scenario_name: str) -> None:
        """Change the current simulation scenario."""
        if scenario_name in SCENARIOS:
            self.current_scenario = SCENARIOS[scenario_name]
        else:
            raise ValueError(f"Unknown scenario: {scenario_name}")

    def tick(self, timestamp: datetime) -> dict:
        """Advance the simulation by one tick and generate a sensor reading."""
        self.tick_count += 1
        
        # Update RR interval
        self.rr_noise_state = (0.8 * self.rr_noise_state + 
                              0.2 * self.rng.normal(0, self.current_scenario.rr_noise_std))
        
        target_rr = self.current_scenario.rr_target_ms
        if self.current_scenario.name == "LONG_DURATION":
            # Add cumulative fatigue drift: reduce target RR by 2ms every 60 ticks
            fatigue_drop = (self.tick_count // 60) * 2.0
            target_rr = max(461.0, target_rr - fatigue_drop)  # Cap HR at 130bpm
            
        self.current_rr_ms += (self.current_scenario.rr_drift_rate * 
                              (target_rr - self.current_rr_ms) + 
                              self.rr_noise_state)
        
        # Clamp RR to physiologically plausible range
        self.current_rr_ms = max(330.0, min(1200.0, self.current_rr_ms))
        
        # Update temperature
        self.temp_noise_state = (0.9 * self.temp_noise_state + 
                                0.1 * self.rng.normal(0, self.current_scenario.temp_noise_std))
        self.current_temp_c += (self.current_scenario.temp_drift_rate * 
                               (self.current_scenario.temp_target_c - self.current_temp_c) + 
                               self.temp_noise_state)
        
        # Clamp temperature to physiologically plausible range
        self.current_temp_c = max(35.0, min(40.5, self.current_temp_c))
        
        # Update accelerometer
        if self.current_scenario.activity_label == "REST":
            accel_x = self.rng.normal(0, 0.01)
            accel_y = self.rng.normal(0, 0.01)
            accel_z = 9.81 + self.rng.normal(0, 0.02)
        else:
            rms_target = self.current_scenario.accel_rms_target
            noise_std = self.current_scenario.accel_noise_std
            accel_x = self.rng.normal(0, rms_target + noise_std)
            accel_y = self.rng.normal(0, rms_target + noise_std)
            accel_z = 9.81 + self.rng.normal(0, rms_target + noise_std)
            
        self.current_accel = (accel_x, accel_y, accel_z)
        
        return {
            "soldier_id": self.soldier_id,
            "timestamp": timestamp.isoformat(),
            "rr_interval_ms": round(self.current_rr_ms, 2),
            "temperature_c": round(self.current_temp_c, 3),
            "accel_x": round(accel_x, 4),
            "accel_y": round(accel_y, 4),
            "accel_z": round(accel_z, 4),
            "activity_label": self.current_scenario.activity_label,
            "source": "simulator",
        }

class SimulationManager:
    """Manages multiple SoldierSimulator instances and the simulation loop."""
    
    def __init__(self):
        self.simulators: Dict[int, SoldierSimulator] = {}
        self.is_running: bool = False
        self.tick_count: int = 0
        self.started_at: Optional[datetime] = None
        self.active_scenario: str = DEFAULT_SCENARIO
        self.mission_id: Optional[int] = None
        self._task: Optional[asyncio.Task] = None
        
    def start(self, soldier_ids: list[int], scenario: str, mission_id: int | None = None) -> None:
        """Initialize simulators. Call launch_task() separately from async context."""
        if self.is_running:
            self.stop()
        self.active_scenario = scenario if scenario in SCENARIOS else DEFAULT_SCENARIO
        self.mission_id = mission_id
        self.simulators.clear()
        for index, s_id in enumerate(soldier_ids):
            sim = SoldierSimulator(s_id, index)
            sim.set_scenario(self.active_scenario)
            self.simulators[s_id] = sim
        self.is_running = True
        self.started_at = datetime.utcnow()
        self.tick_count = 0

    def launch_task(self) -> None:
        """Launch the async background loop. Must be called from within an async context."""
        if self._task is None or self._task.done():
            import asyncio
            self._task = asyncio.create_task(self._run_loop())
        
    def stop(self) -> None:
        """Stop the simulation."""
        self.is_running = False
        if self._task is not None:
            self._task.cancel()
            self._task = None
        self.started_at = None
        
    def set_scenario(self, scenario_name: str) -> None:
        """Change scenario for all active simulators."""
        if scenario_name in SCENARIOS:
            self.active_scenario = scenario_name
            for sim in self.simulators.values():
                sim.set_scenario(scenario_name)
        else:
            raise ValueError(f"Unknown scenario: {scenario_name}")
            
    def get_status(self) -> dict:
        """Get the current simulation status."""
        return {
            "is_running": self.is_running,
            "running": self.is_running,  # alias for frontend
            "active_soldiers": len(self.simulators),
            "soldier_ids": list(self.simulators.keys()),
            "scenario": self.active_scenario,
            "tick_count": self.tick_count,
            "tick_rate_hz": SIMULATION_TICK_RATE_HZ,
            "started_at": self.started_at.isoformat() if self.started_at else None,
        }
        
    async def _run_tick(self, db) -> None:
        """Run a single tick for all active simulators against an existing DB session."""
        from app.models import SensorReading, DataSource
        from app.pipeline.processor import process_and_assess

        now = datetime.utcnow()
        self.tick_count += 1

        for soldier_id, sim in list(self.simulators.items()):
            reading_dict = sim.tick(now)
            reading = SensorReading(
                soldier_id=reading_dict["soldier_id"],
                timestamp=now,
                rr_interval_ms=reading_dict["rr_interval_ms"],
                temperature_c=reading_dict["temperature_c"],
                accel_x=reading_dict["accel_x"],
                accel_y=reading_dict["accel_y"],
                accel_z=reading_dict["accel_z"],
                activity_label=reading_dict.get("activity_label"),
                mission_id=self.mission_id,
                source=DataSource.SIMULATOR,
            )
            db.add(reading)
        await db.commit()

        for soldier_id in list(self.simulators.keys()):
            try:
                await process_and_assess(
                    soldier_id=soldier_id,
                    db=db,
                    mission_id=self.mission_id,
                )
            except Exception as exc:
                print(f"[Pipeline] Error for soldier {soldier_id}: {exc}")

    async def _run_loop(self) -> None:
        """Async simulation loop. Ticks at SIMULATION_TICK_RATE_HZ, saves readings, triggers pipeline."""
        from app.database import AsyncSessionLocal
        import asyncio

        tick_interval = 1.0 / SIMULATION_TICK_RATE_HZ

        while self.is_running:
            async with AsyncSessionLocal() as db:
                await self._run_tick(db)
            await asyncio.sleep(tick_interval)

# Singleton instance
simulation_manager = SimulationManager()

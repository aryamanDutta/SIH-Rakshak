from typing import Optional, Dict, Any
from datetime import datetime

from app.ingestion.interface import DataSource
from app.simulation.simulator import SoldierSimulator, SCENARIOS

class SimulatorSource(DataSource):
    """DataSource implementation backed by the software sensor simulator."""
    
    def __init__(self, soldier_id: int, soldier_index: int = 0, scenario: str = "PATROL"):
        self._simulator = SoldierSimulator(soldier_id, soldier_index)
        self._simulator.set_scenario(scenario)
    
    def get_reading(self, soldier_id: int, timestamp: Optional[datetime] = None) -> Dict[str, Any]:
        ts = timestamp or datetime.utcnow()
        return self._simulator.tick(ts)
    
    @property
    def source_name(self) -> str:
        return "simulator"
    
    def is_available(self) -> bool:
        return True
    
    def set_scenario(self, scenario_name: str) -> None:
        self._simulator.set_scenario(scenario_name)

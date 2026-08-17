from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class SimulationStartRequest(BaseModel):
    soldier_ids: List[int]
    scenario: str = "PATROL"
    mission_id: Optional[int] = None

class SimulationStatusResponse(BaseModel):
    is_running: bool
    active_soldiers: List[int]
    scenario: str
    tick_count: int
    started_at: Optional[datetime] = None

class ScenarioChangeRequest(BaseModel):
    scenario: str

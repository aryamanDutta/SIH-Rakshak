from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict
from .soldier import SoldierDetailResponse

class SquadBase(BaseModel):
    name: str
    unit: str
    commander_name: Optional[str] = None

class SquadCreate(SquadBase):
    pass

class SquadResponse(SquadBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SquadStatusResponse(BaseModel):
    squad_id: int
    squad_name: str
    total_soldiers: int
    soldiers: List[SoldierDetailResponse]
    avg_fatigue_score: float
    risk_distribution: Dict[str, int]
    highest_risk_soldier_id: Optional[int]
    active_alert_count: int

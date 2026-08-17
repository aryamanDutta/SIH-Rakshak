from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from .fatigue import FatigueAssessmentResponse
from .sensor import SensorReadingResponse

class SoldierBase(BaseModel):
    name: str
    call_sign: str
    rank: str
    squad_id: int
    age: int
    weight_kg: float
    height_cm: float

class SoldierCreate(SoldierBase):
    soldier_uid: str

class SoldierResponse(SoldierBase):
    id: int
    soldier_uid: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SoldierDetailResponse(SoldierResponse):
    latest_fatigue: Optional[FatigueAssessmentResponse] = None
    latest_reading: Optional[SensorReadingResponse] = None

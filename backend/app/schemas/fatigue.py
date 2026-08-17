from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ContributorsSchema(BaseModel):
    hr_deviation: float
    hrv_deterioration: float
    activity_load: float
    temperature_trend: float

class FatigueAssessmentResponse(BaseModel):
    id: int
    soldier_id: int
    timestamp: datetime
    fatigue_score: float
    risk_category: str
    contributors: ContributorsSchema
    model_version: str
    baseline_valid: bool
    activity_context: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

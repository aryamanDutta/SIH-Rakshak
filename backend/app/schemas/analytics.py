from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any
from .mission import MissionEventResponse

class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float

class SoldierAnalyticsResponse(BaseModel):
    soldier_id: int
    hr_trend: List[TimeSeriesPoint]
    hrv_trend: List[TimeSeriesPoint]
    temp_trend: List[TimeSeriesPoint]
    fatigue_trend: List[TimeSeriesPoint]
    activity_trend: List[TimeSeriesPoint]

class SquadAnalyticsResponse(BaseModel):
    squad_id: int
    avg_fatigue_trend: List[TimeSeriesPoint]
    high_risk_count_trend: List[TimeSeriesPoint]
    risk_distribution_history: List[Dict[str, Any]]

class MissionAnalyticsResponse(BaseModel):
    mission_id: int
    fatigue_progression: List[TimeSeriesPoint]
    phase_timeline: List[MissionEventResponse]
    high_risk_periods: List[Dict[str, Any]]

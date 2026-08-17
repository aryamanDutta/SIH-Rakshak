from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class SensorReadingResponse(BaseModel):
    id: int
    soldier_id: int
    timestamp: datetime
    rr_interval_ms: float
    temperature_c: float
    accel_x: float
    accel_y: float
    accel_z: float
    activity_label: Optional[str] = None
    mission_id: Optional[int] = None
    source: str
    
    model_config = ConfigDict(from_attributes=True)

class PhysiologicalFeaturesResponse(BaseModel):
    id: int
    soldier_id: int
    timestamp: datetime
    window_size: int
    mean_hr: float
    sdnn: float
    rmssd: float
    pnn50: float
    temperature: float
    temperature_trend: float
    activity_intensity: float
    activity_label: Optional[str] = None
    hr_change: Optional[float] = None
    hrv_change: Optional[float] = None
    recovery_indicator: Optional[float] = None
    mission_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

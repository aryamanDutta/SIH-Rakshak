from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class MissionCreate(BaseModel):
    name: str
    mission_type: str
    squad_id: int
    conditions: Optional[str] = None

class MissionResponse(BaseModel):
    id: int
    mission_uid: str
    name: str
    mission_type: str
    squad_id: int
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class MissionStartRequest(BaseModel):
    name: str
    mission_type: str
    squad_id: int
    conditions: Optional[str] = None

class MissionEventResponse(BaseModel):
    id: int
    mission_id: int
    timestamp: datetime
    phase: str
    description: str
    
    model_config = ConfigDict(from_attributes=True)

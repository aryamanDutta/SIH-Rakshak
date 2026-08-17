from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional
import enum
from app.database import Base

class MissionPhase(str, enum.Enum):
    REST = "REST"
    PATROL = "PATROL"
    WALK = "WALK"
    HIGH_ACTIVITY = "HIGH_ACTIVITY"
    RECOVERY = "RECOVERY"
    BRIEFING = "BRIEFING"
    EXTRACTION = "EXTRACTION"

class MissionEvent(Base):
    __tablename__ = "mission_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    mission_id: Mapped[int] = mapped_column(ForeignKey("missions.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(index=True)
    phase: Mapped[MissionPhase]
    description: Mapped[str] = mapped_column(Text)
    affected_soldier_ids: Mapped[Optional[str]] = mapped_column(Text)  # JSON list of soldier IDs
    mission: Mapped["Mission"] = relationship(back_populates="events")

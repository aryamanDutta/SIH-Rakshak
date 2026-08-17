from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, Optional
import enum
from app.database import Base

class MissionStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ABORTED = "ABORTED"

class Mission(Base):
    __tablename__ = "missions"
    id: Mapped[int] = mapped_column(primary_key=True)
    mission_uid: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    mission_type: Mapped[str] = mapped_column(String(100))
    squad_id: Mapped[int] = mapped_column(ForeignKey("squads.id"))
    status: Mapped[MissionStatus] = mapped_column(default=MissionStatus.PLANNED)
    conditions: Mapped[Optional[str]] = mapped_column(Text)  # JSON string for context
    started_at: Mapped[Optional[datetime]]
    ended_at: Mapped[Optional[datetime]]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    # relationships
    squad: Mapped["Squad"] = relationship()
    events: Mapped[List["MissionEvent"]] = relationship(back_populates="mission")

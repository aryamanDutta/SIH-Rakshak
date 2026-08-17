from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, Optional
from app.database import Base

class Soldier(Base):
    __tablename__ = "soldiers"
    id: Mapped[int] = mapped_column(primary_key=True)
    soldier_uid: Mapped[str] = mapped_column(String(20), unique=True)  # e.g. "RK-007"
    name: Mapped[str] = mapped_column(String(100))
    call_sign: Mapped[str] = mapped_column(String(50))
    rank: Mapped[str] = mapped_column(String(50))
    squad_id: Mapped[int] = mapped_column(ForeignKey("squads.id"))
    age: Mapped[int]
    weight_kg: Mapped[float]
    height_cm: Mapped[float]
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    # relationships
    squad: Mapped["Squad"] = relationship(back_populates="soldiers")
    sensor_readings: Mapped[List["SensorReading"]] = relationship(back_populates="soldier")
    baseline: Mapped[Optional["PersonalBaseline"]] = relationship(back_populates="soldier", uselist=False)
    fatigue_assessments: Mapped[List["FatigueAssessment"]] = relationship(back_populates="soldier")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="soldier")

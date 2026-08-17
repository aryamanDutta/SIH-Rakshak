from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional
import enum
from app.database import Base

class RiskCategory(str, enum.Enum):
    NORMAL = "NORMAL"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class FatigueAssessment(Base):
    """
    Fatigue risk assessment output.
    
    DISCLAIMER: This is a PROTOTYPE heuristic fatigue-risk estimation and
    is NOT a clinically validated diagnostic or medical assessment system.
    """
    __tablename__ = "fatigue_assessments"
    id: Mapped[int] = mapped_column(primary_key=True)
    soldier_id: Mapped[int] = mapped_column(ForeignKey("soldiers.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(index=True)
    fatigue_score: Mapped[float]       # 0–100
    risk_category: Mapped[RiskCategory]
    # Per-contributor scores (0–1 scale)
    hr_deviation_score: Mapped[float]
    hrv_deterioration_score: Mapped[float]
    activity_load_score: Mapped[float]
    temperature_trend_score: Mapped[float]
    # Context
    model_version: Mapped[str] = mapped_column(String(50), default="heuristic-v1")
    mission_id: Mapped[Optional[int]] = mapped_column(ForeignKey("missions.id"))
    activity_context: Mapped[Optional[str]] = mapped_column(String(50))
    baseline_valid: Mapped[bool] = mapped_column(default=False)
    # relationship
    soldier: Mapped["Soldier"] = relationship(back_populates="fatigue_assessments")

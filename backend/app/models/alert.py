from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional
import enum
from app.database import Base

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AlertType(str, enum.Enum):
    FATIGUE_ELEVATED = "FATIGUE_ELEVATED"
    FATIGUE_HIGH = "FATIGUE_HIGH"
    FATIGUE_CRITICAL = "FATIGUE_CRITICAL"
    HR_ANOMALY = "HR_ANOMALY"
    TEMPERATURE_ANOMALY = "TEMPERATURE_ANOMALY"
    PROLONGED_HIGH_INTENSITY = "PROLONGED_HIGH_INTENSITY"

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    soldier_id: Mapped[int] = mapped_column(ForeignKey("soldiers.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(index=True)
    alert_type: Mapped[AlertType]
    severity: Mapped[AlertSeverity]
    message: Mapped[str] = mapped_column(Text)
    is_acknowledged: Mapped[bool] = mapped_column(default=False)
    acknowledged_at: Mapped[Optional[datetime]]
    mission_id: Mapped[Optional[int]] = mapped_column(ForeignKey("missions.id"))
    fatigue_score_at_alert: Mapped[Optional[float]]
    # relationship
    soldier: Mapped["Soldier"] = relationship(back_populates="alerts")

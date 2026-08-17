from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base

class PersonalBaseline(Base):
    """
    Individualized physiological baseline per soldier.
    Used for z-score deviation calculation rather than universal thresholds.
    Updated incrementally from mission history.
    """
    __tablename__ = "personal_baselines"
    id: Mapped[int] = mapped_column(primary_key=True)
    soldier_id: Mapped[int] = mapped_column(ForeignKey("soldiers.id"), unique=True)
    # HR baseline
    baseline_hr_mean: Mapped[float]
    baseline_hr_std: Mapped[float]
    # HRV baseline (using RMSSD as primary HRV metric)
    baseline_hrv_mean: Mapped[float]   # mean RMSSD
    baseline_hrv_std: Mapped[float]
    # Temperature baseline
    baseline_temp_mean: Mapped[float]
    baseline_temp_std: Mapped[float]
    # Metadata
    sample_count: Mapped[int] = mapped_column(default=0)
    is_valid: Mapped[bool] = mapped_column(default=False)  # True when sample_count >= BASELINE_MIN_SAMPLES
    computed_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    # relationship
    soldier: Mapped["Soldier"] = relationship(back_populates="baseline")

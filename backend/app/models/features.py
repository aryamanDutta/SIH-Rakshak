from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional
from app.database import Base

class PhysiologicalFeatures(Base):
    """
    Derived features computed from a window of SensorReadings.
    This is the input to the fatigue/baseline engine.
    """
    __tablename__ = "physiological_features"
    id: Mapped[int] = mapped_column(primary_key=True)
    soldier_id: Mapped[int] = mapped_column(ForeignKey("soldiers.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(index=True)
    window_size: Mapped[int]           # Number of RR samples used
    # Cardiac features (derived from RR intervals)
    mean_hr: Mapped[float]             # beats per minute
    sdnn: Mapped[float]                # Standard deviation of NN intervals (ms)
    rmssd: Mapped[float]               # Root mean square of successive differences (ms)
    pnn50: Mapped[float]               # % of successive RR diffs > 50ms
    # Temperature features
    temperature: Mapped[float]         # Current temperature
    temperature_trend: Mapped[float]   # Slope of temp over window (°C/min)
    # Activity features
    activity_intensity: Mapped[float]  # RMS of accel vector (0–1 normalized)
    activity_label: Mapped[Optional[str]] = mapped_column(String(50))
    # Derived change indicators (compared to previous window)
    hr_change: Mapped[Optional[float]]          # Delta HR from previous window
    hrv_change: Mapped[Optional[float]]         # Delta RMSSD from previous window
    recovery_indicator: Mapped[Optional[float]] # 0=no recovery, 1=strong recovery
    mission_id: Mapped[Optional[int]] = mapped_column(ForeignKey("missions.id"))

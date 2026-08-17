from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional
import enum
from app.database import Base

class DataSource(str, enum.Enum):
    SIMULATOR = "simulator"
    ESP32 = "esp32"
    DATASET = "dataset"

class SensorReading(Base):
    """
    Normalized sensor reading. The primary raw physiological input.
    
    RR interval (ms) is the primary cardiac measurement.
    HR is derived from RR, NOT a raw sensor value.
    HRV features (SDNN, RMSSD, pNN50) are computed from a window of RR intervals
    by the signal processing layer.
    """
    __tablename__ = "sensor_readings"
    id: Mapped[int] = mapped_column(primary_key=True)
    soldier_id: Mapped[int] = mapped_column(ForeignKey("soldiers.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(index=True)
    rr_interval_ms: Mapped[float]     # Primary cardiac measurement (beat-to-beat interval)
    temperature_c: Mapped[float]       # Body/skin temperature
    accel_x: Mapped[float]             # Accelerometer X (g)
    accel_y: Mapped[float]             # Accelerometer Y (g)
    accel_z: Mapped[float]             # Accelerometer Z (g)
    activity_label: Mapped[Optional[str]] = mapped_column(String(50))  # REST, WALK, RUN, etc.
    mission_id: Mapped[Optional[int]] = mapped_column(ForeignKey("missions.id"))
    source: Mapped[DataSource] = mapped_column(default=DataSource.SIMULATOR)
    # relationship
    soldier: Mapped["Soldier"] = relationship(back_populates="sensor_readings")

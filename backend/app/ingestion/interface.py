"""
Data Source Abstraction Interface

All sensor data sources must implement the DataSource interface.
This ensures the RAKSHAK processing pipeline is source-agnostic.

Current implementations:
    SimulatorSource  — generates synthetic physiological data
    
Future implementations:
    ESP32Source      — receives real sensor data from ESP32 wearable harness

To add a new source:
    1. Create a new class implementing DataSource
    2. Implement get_reading() to return a dict matching the SensorReading schema
    3. Register the source in the SimulationManager or equivalent
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Dict, Any

class DataSource(ABC):
    """Abstract base class for all RAKSHAK sensor data sources."""
    
    @abstractmethod
    def get_reading(self, soldier_id: int, timestamp: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Return a normalized sensor reading for a soldier.
        
        The returned dict must match the SensorReading schema:
            soldier_id: int
            timestamp: str (ISO format)
            rr_interval_ms: float     # primary cardiac measurement
            temperature_c: float
            accel_x: float
            accel_y: float
            accel_z: float
            activity_label: str
            source: str               # 'simulator', 'esp32', or 'dataset'
        """
        ...
    
    @property
    @abstractmethod
    def source_name(self) -> str:
        """Identifier for this data source type."""
        ...
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if this data source is available and ready."""
        ...

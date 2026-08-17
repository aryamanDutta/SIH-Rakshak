"""
ESP32 Data Source (Future Implementation)

This stub class will be implemented when the physical RAKSHAK wearable harness
(ESP32 + ECG + Temperature + IMU) is available after SIH selection.

To enable:
    1. Implement WebSocket or HTTP polling to receive data from ESP32
    2. Parse the ESP32 packet format into the normalized SensorReading schema
    3. Replace SimulatorSource with ESP32Source in the SimulationManager
    4. No changes to the processing, baseline, AI, or API layers are required.
"""
from typing import Optional, Dict, Any
from datetime import datetime

from app.ingestion.interface import DataSource

class ESP32Source(DataSource):
    """FUTURE: DataSource implementation for real ESP32 wearable sensor hardware."""
    
    def __init__(self, device_id: str, soldier_id: int):
        self._device_id = device_id
        self._soldier_id = soldier_id
        raise NotImplementedError(
            "ESP32Source is not implemented in the software prototype phase. "
            "Use SimulatorSource instead. This class will be implemented after "
            "hardware integration following SIH selection."
        )
    
    def get_reading(self, soldier_id: int, timestamp: Optional[datetime] = None) -> Dict[str, Any]:
        raise NotImplementedError("ESP32Source is not implemented yet.")
    
    @property
    def source_name(self) -> str:
        return "esp32"
    
    def is_available(self) -> bool:
        return False

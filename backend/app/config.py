from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "RAKSHAK"
    APP_VERSION: str = "0.1.0"
    DATABASE_URL: str = "sqlite+aiosqlite:///./rakshak.db"
    SIMULATION_TICK_RATE_HZ: float = 1.0
    SIMULATION_RR_WINDOW_SIZE: int = 20
    BASELINE_MIN_SAMPLES: int = 30
    BASELINE_ROLLING_ALPHA: float = 0.1
    FATIGUE_WEIGHTS: dict = {"hr_deviation": 0.30, "hrv_deterioration": 0.35, "activity_load": 0.25, "temperature_trend": 0.10}
    ALERT_COOLDOWN_SECONDS: int = 300
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

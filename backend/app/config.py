from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "AUTHENTIQ"
    app_env: Literal["development", "staging", "production"] = "development"
    api_prefix: str = "/api/v1"
    debug: bool = True

    # --- Database ---
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/authentiq"
    db_echo: bool = False
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # --- Redis / Celery ---
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    # When true (or Redis unavailable), tasks run in-process so the platform
    # is fully demonstrable without external infrastructure.
    use_in_process_tasks: bool = True
    task_timeout_seconds: int = 600

    # --- Storage ---
    storage_type: Literal["local", "s3"] = "local"
    storage_path: str = "./storage"
    s3_bucket: str = "authentiq"
    s3_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    public_base_url: str = "http://localhost:8000"

    # --- Upload limits ---
    max_upload_size_mb: int = 500
    max_video_duration_seconds: int = 1800
    max_audio_duration_seconds: int = 1800

    # --- ML & Microservices ---
    model_device: Literal["cpu", "cuda", "mps"] = "cpu"
    use_mock_models: bool = True
    model_cache_dir: str = "./models"
    face_detector_model_path: str | None = None

    # Standalone ML Microservices & Hugging Face Spaces URLs
    image_ml_url: str | None = None  # e.g., "http://localhost:8001" or Hugging Face Space URL
    audio_ml_url: str | None = None  # e.g., "http://localhost:8002" or Hugging Face Space URL
    video_ml_url: str | None = None  # e.g., "http://localhost:8003" or Hugging Face Space URL

    # External API Offloading Keys
    hf_api_token: str | None = None
    replicate_api_token: str | None = None
    sightengine_api_user: str | None = None
    sightengine_api_secret: str | None = None
    deepai_api_key: str | None = None


    # --- Pipeline tuning ---
    sample_fps: float = 2.0
    max_frames: int = 240
    heatmap_alpha: float = 0.45
    enable_rppg: bool = True
    rppg_min_signal_quality: float = 0.4

    # --- Security ---
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 30
    jwt_refresh_ttl_days: int = 7
    password_hash_rounds: int = 12
    api_key_ttl_days: int = 365
    idempotency_ttl_seconds: int = 3600

    # --- Rate limiting (per window, per client) ---
    rate_limit_anonymous: str = "10/hour"
    rate_limit_authenticated: str = "100/hour"
    rate_limit_api: str = "500/hour"

    # --- Verdict thresholds (calibrated probability of manipulation) ---
    verdict_authentic_max: float = 0.30
    verdict_inconclusive_max: float = 0.60
    verdict_suspicious_max: float = 0.80

    # --- CORS ---
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:3001"]
    )

    # --- Observability ---
    log_level: str = "INFO"
    log_json: bool = True
    metrics_enabled: bool = True

    # --- Media retention ---
    retention_days: int = 30

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @property
    def rate_limit_anonymous_per_hour(self) -> int:
        return _parse_per_hour(self.rate_limit_anonymous)

    @property
    def rate_limit_authenticated_per_hour(self) -> int:
        return _parse_per_hour(self.rate_limit_authenticated)

    @property
    def rate_limit_api_per_hour(self) -> int:
        return _parse_per_hour(self.rate_limit_api)


def _parse_per_hour(value: str) -> int:
    """Parse a 'N/hour' (or 'N/minute') rate limit string into per-hour count."""
    try:
        number, unit = value.strip().lower().split("/")
        number = int(number)
        if unit in ("minute", "min", "m"):
            return number * 60
        if unit in ("second", "sec", "s"):
            return number * 3600
        return number
    except Exception:
        return 100


@lru_cache
def get_settings() -> Settings:
    return Settings()

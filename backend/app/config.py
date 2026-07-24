from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Ariza API"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://ariza:ariza@localhost:5433/ariza"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "ariza"
    s3_secret_key: str = "ariza12345"
    s3_bucket: str = "ariza-complaints"
    s3_region: str = "us-east-1"
    s3_public_base_url: str = "http://localhost:9000/ariza-complaints"

    cors_origins: list[str] = ["http://localhost:3000"]

    smtp_host: str | None = None
    smtp_port: int = 587

    # Optional: when set, AI service will call an external vision/LLM API
    # instead of the built-in keyword heuristics. Left blank by default so
    # the project runs fully offline out of the box.
    ai_provider_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()

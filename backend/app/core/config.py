"""
Configuration management using Pydantic Settings.
All environment variables are loaded and validated here.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "quantum-disaster-system"
    env: Literal["dev", "staging", "prod"] = "dev"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "quantum_disaster"
    db_user: str = "postgres"
    db_password: str = "password"
    database_url: str | None = None

    # External APIs
    osrm_base_url: str = "https://router.project-osrm.org"
    overpass_url: str = "https://overpass-api.de/api/interpreter"

    # Resource Discovery
    resource_search_radius_km: float = 15.0
    resource_discovery_limit: int = 50  # Max resources to discover/use

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    @property
    def db_connection_string(self) -> str:
        """Generate database connection string."""
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def async_db_connection_string(self) -> str:
        """Generate async database connection string."""
        if self.database_url:
            # Replace driver for async
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()

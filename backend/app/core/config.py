"""Application configuration with production safety checks."""
import os
from functools import lru_cache

DEFAULT_SECRET = "your-secret-key-change-in-production"


class Settings:
    def __init__(self) -> None:
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.secret_key: str = os.getenv("SECRET_KEY", DEFAULT_SECRET)
        self.database_url: str = os.getenv(
            "DATABASE_URL",
            "postgresql://swift_user:swift_password@localhost:55432/swift_distro_hub",
        )
        self.access_token_expire_minutes: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
        )
        self.require_auth: bool = os.getenv("REQUIRE_AUTH", "true").lower() == "true"
        self.integration_sandbox: bool = os.getenv("INTEGRATION_SANDBOX", "true").lower() == "true"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    def validate_production(self) -> None:
        if self.is_production and self.secret_key == DEFAULT_SECRET:
            raise RuntimeError(
                "SECRET_KEY must be set to a secure value in production. "
                "Refusing to start with default secret."
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_production()
    return settings

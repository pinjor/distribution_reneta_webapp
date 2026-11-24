"""Application configuration with production safety checks.

Production startup requires:
- ENVIRONMENT=production (or prod)
- SECRET_KEY set to a non-empty value other than the development default
- REQUIRE_AUTH=true
- CORS_ORIGINS as a comma-separated list of explicit origins, never *
- DATABASE_URL and REDIS_URL pointing at the deployment services

Development keeps the defaults below when those variables are unset.
"""
import os
from functools import lru_cache

DEFAULT_SECRET = "your-secret-key-change-in-production"
DEFAULT_DATABASE_URL = "postgresql://swift_user:swift_password@localhost:55432/swift_distro_hub"
DEFAULT_REDIS_URL = "redis://localhost:6379/0"
DEFAULT_CORS_ORIGINS = (
    "http://localhost",
    "http://localhost:80",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8088",
    "http://localhost:9080",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8088",
    "http://127.0.0.1:9080",
)


def _parse_cors_origins(raw: str | None) -> list[str]:
    if raw is None or not raw.strip():
        return list(DEFAULT_CORS_ORIGINS)
    origins = []
    for part in raw.split(","):
        origin = part.strip().rstrip("/")
        if origin and origin not in origins:
            origins.append(origin)
    return origins or list(DEFAULT_CORS_ORIGINS)


class Settings:
    def __init__(self) -> None:
        self.environment: str = os.getenv("ENVIRONMENT", "development")
        self.secret_key: str = os.getenv("SECRET_KEY", DEFAULT_SECRET)
        self.database_url: str = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
        self.redis_url: str = os.getenv("REDIS_URL", DEFAULT_REDIS_URL)
        self.access_token_expire_minutes: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
        )
        self.require_auth: bool = os.getenv("REQUIRE_AUTH", "true").lower() == "true"
        self.integration_sandbox: bool = os.getenv("INTEGRATION_SANDBOX", "true").lower() == "true"
        self.cors_origins: list[str] = _parse_cors_origins(os.getenv("CORS_ORIGINS"))

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    def validate_production(self) -> None:
        if not self.is_production:
            return
        secret = (self.secret_key or "").strip()
        if not secret or secret == DEFAULT_SECRET:
            raise RuntimeError(
                "SECRET_KEY must be set to a non-default value in production. "
                "Refusing to start."
            )
        if not self.require_auth:
            raise RuntimeError(
                "REQUIRE_AUTH=false is not allowed in production. Refusing to start."
            )
        if "*" in self.cors_origins:
            raise RuntimeError(
                "CORS_ORIGINS must list explicit origins in production. "
                "Wildcard origins are not allowed."
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_production()
    return settings

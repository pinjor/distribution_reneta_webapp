"""Production configuration guards. These do not change the running process."""
import pytest

from app.core.config import DEFAULT_CORS_ORIGINS, DEFAULT_SECRET, Settings


def test_development_defaults_include_local_origins(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "development")
    settings = Settings()
    for origin in (
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8088",
        "http://localhost:9080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
    ):
        assert origin in settings.cors_origins
    settings.validate_production()


def test_cors_origins_are_split_on_commas(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:8088, http://127.0.0.1:9080")
    settings = Settings()
    assert settings.cors_origins == ["http://localhost:8088", "http://127.0.0.1:9080"]


def test_production_rejects_default_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", DEFAULT_SECRET)
    monkeypatch.setenv("REQUIRE_AUTH", "true")
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        Settings().validate_production()


def test_production_rejects_empty_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "   ")
    monkeypatch.setenv("REQUIRE_AUTH", "true")
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        Settings().validate_production()


def test_production_rejects_disabled_auth(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "a-real-production-secret")
    monkeypatch.setenv("REQUIRE_AUTH", "false")
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")
    with pytest.raises(RuntimeError, match="REQUIRE_AUTH"):
        Settings().validate_production()


def test_production_rejects_wildcard_cors(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "a-real-production-secret")
    monkeypatch.setenv("REQUIRE_AUTH", "true")
    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        Settings().validate_production()


def test_default_cors_tuple_is_nonempty():
    assert DEFAULT_CORS_ORIGINS

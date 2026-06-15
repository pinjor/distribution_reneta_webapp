"""Pytest configuration and fixtures."""
import os
import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("REQUIRE_AUTH", "true")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.auth import get_password_hash
from app.models import Employee
import app.models_platform  # noqa: F401
from main import app

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    user = Employee(
        employee_id="ADM001",
        first_name="Admin",
        last_name="User",
        email="admin@test.com",
        hashed_password=get_password_hash("admin123"),
        role="admin",
        is_active=True,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def regular_user(db_session):
    user = Employee(
        employee_id="USR001",
        first_name="Regular",
        last_name="User",
        email="user@test.com",
        hashed_password=get_password_hash("user123"),
        role="user",
        is_active=True,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, admin_user):
    resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "admin123", "remember_me": False})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_auth_headers(client, regular_user):
    resp = client.post("/api/auth/login", json={"email": "user@test.com", "password": "user123", "remember_me": False})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

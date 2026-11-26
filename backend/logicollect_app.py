"""Isolated LogiCollect Pro mobile API. Never used by docker-compose or uvicorn main:app.

    DATABASE_URL=postgresql://.../logicollect_dev uvicorn logicollect_app:app --host 127.0.0.1 --port 18040
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.database import Base, engine
from app.services.logicollect.errors import LcError

ALLOWED_PREFIXES = ("logicollect", "lc_", "f4b", "f4c", "f4d", "reneta_e2e")


def _assert_disposable_database() -> None:
    name = engine.url.database or ""
    url = str(engine.url)
    if url.startswith("sqlite"):
        return
    if name == "swift_distro_hub" or "swift_distro_hub" in url:
        raise RuntimeError("logicollect_app refuses swift_distro_hub")
    if name not in {"reneta_e2e"} and not any(name.startswith(p) for p in ALLOWED_PREFIXES):
        raise RuntimeError(f"logicollect_app refuses database {name!r}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _assert_disposable_database()
    import app.models  # noqa: F401
    import app.models_platform  # noqa: F401
    import app.models_logicollect  # noqa: F401

    url = str(engine.url)
    if url.startswith("sqlite"):
        # Pytest in-memory only. PostgreSQL schema comes from Alembic, not create_all.
        Base.metadata.create_all(bind=engine)
    else:
        from sqlalchemy import inspect

        tables = inspect(engine).get_table_names()
        if "lc_sessions" not in tables:
            raise RuntimeError(
                "LogiCollect tables missing. On this disposable database run "
                "`alembic upgrade f3_export_draft` then "
                "`alembic -c alembic_logicollect.ini upgrade head`. "
                "create_all is not used for PostgreSQL."
            )
    yield


def create_logicollect_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="LogiCollect Pro Mobile API — DEVELOPMENT",
        description=(
            "Disposable isolated field API for Flutter integration. "
            "Not mounted on main:app. Not production. Not business-approved for live stock or credit write-off."
        ),
        version="1.0.0-dev",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(LcError)
    async def lc_error_handler(_request: Request, exc: LcError):
        return JSONResponse(status_code=exc.status_code, content={"code": exc.lc_code, "message": exc.lc_message})

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"code": "VALIDATION_ERROR", "message": "Request failed schema validation"},
        )

    from app.routers.logicollect import router as lc_router

    app.include_router(lc_router, prefix="/api/logicollect/v1")

    @app.get("/health")
    def health():
        return {"status": "healthy", "logicollect": True, "production": False}

    @app.get("/")
    def root():
        return {
            "message": "LogiCollect Pro Mobile API (development)",
            "docs": "/docs",
            "openapi": "/openapi.json",
            "prefix": "/api/logicollect/v1",
        }

    return app


_assert_disposable_database()
app = create_logicollect_app()

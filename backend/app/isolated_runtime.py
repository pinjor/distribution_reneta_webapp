"""Process-local marker for the F.4B.2-DEV isolated FastAPI app.

This is not an environment variable. Production `main:app` never sets it.
Only `create_api_app(isolated_workflow=True)` installs the middleware.
"""
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_isolated_workflow = ContextVar("f4b2_dev_isolated_workflow", default=False)


def isolated_workflow_active() -> bool:
    return bool(_isolated_workflow.get())


class IsolatedWorkflowMarkerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        token = _isolated_workflow.set(True)
        try:
            return await call_next(request)
        finally:
            _isolated_workflow.reset(token)

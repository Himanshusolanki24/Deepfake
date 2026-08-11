from __future__ import annotations

import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from ..core.exceptions import AuthentiqError
from ..core.logging import analysis_id_var, request_id_var, setup_logging, user_id_var
from ..schemas.common import ApiEnvelope

setup_logging()


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach request_id and timing context to every request."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable]) -> JSONResponse:
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request_id_var.set(request_id)
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-Id"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.1f}"
        return response


class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    """Convert domain errors into the standardized error envelope."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable]) -> JSONResponse:
        try:
            return await call_next(request)  # type: ignore[return-value]
        except AuthentiqError as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content=ApiEnvelope(
                    success=False,
                    data=None,
                    error={
                        "code": exc.code,
                        "message": exc.message,
                        **({"details": exc.details} if exc.details else {}),
                    },
                    request_id=request_id_var.get(),
                ).model_dump(exclude_none=True),
            )
        except Exception as exc:  # pragma: no cover - defensive
            import logging

            logging.getLogger("app").exception("Unhandled error", exc_info=exc)
            return JSONResponse(
                status_code=500,
                content=ApiEnvelope(
                    success=False,
                    data=None,
                    error={"code": "INTERNAL_ERROR", "message": "An internal error occurred."},
                    request_id=request_id_var.get(),
                ).model_dump(exclude_none=True),
            )


class AnalysisContextMiddleware(BaseHTTPMiddleware):
    """Extract analysis_id/user_id from path/header for structured logging."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable]) -> JSONResponse:
        if "analysis_id" in request.path_params:
            analysis_id_var.set(str(request.path_params["analysis_id"]))
        user_id = request.headers.get("X-User-Id")
        if user_id:
            user_id_var.set(user_id)
        return await call_next(request)  # type: ignore[return-value]

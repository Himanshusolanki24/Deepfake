from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .api import compat as compat_api
from .api import router as api_router
from .config import get_settings
from .core.logging import get_logger, setup_logging
from .core.metrics import metrics
from .core.middleware import (
    AnalysisContextMiddleware,
    ExceptionHandlerMiddleware,
    RequestContextMiddleware,
)
from .db.database import dispose_engine, init_db

settings = get_settings()
setup_logging()
logger = get_logger("authentiq.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("startup", extra={"fields": {"app": settings.app_name, "env": settings.app_env}})
    yield
    await dispose_engine()
    logger.info("shutdown")


app = FastAPI(
    title="AUTHENTIQ API",
    description="Explainable digital media authenticity verification. "
    "Analyzes images, videos and audio and produces calibrated, evidence-backed "
    "manipulation assessments.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(AnalysisContextMiddleware)
app.add_middleware(ExceptionHandlerMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_metrics(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    if settings.metrics_enabled and request.url.path.startswith("/api/v1/analyze"):
        if response.status_code < 400:
            metrics.record_analysis(True, duration)
        else:
            metrics.record_analysis(False, duration)
    return response


@app.get("/")
async def root() -> dict:
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.get("/metrics")
async def metrics_endpoint() -> dict:
    return metrics.snapshot()


# Spec-compliant versioned API (envelope responses).
app.include_router(api_router.api_router, prefix=settings.api_prefix)

# Frontend-compatible routes (bare payloads) for the shipped Next.js app.
app.include_router(compat_api.router)

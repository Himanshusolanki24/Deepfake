from __future__ import annotations

from fastapi import APIRouter

from ..config import get_settings
from ..core.logging import get_logger
from ..core.metrics import metrics
from ..schemas.common import ApiEnvelope

settings = get_settings()
router = APIRouter(tags=["health"])
logger = get_logger("authentiq.health")


@router.get("/health")
async def health() -> ApiEnvelope[dict]:
    from ..db.database import engine
    from ..forensic.fusion.calibration import get_calibrator
    from ..ml.model_registry import ENGINE_VERSION, get_registry

    db_ok = True
    redis_ok = True
    try:
        async with engine.connect() as conn:
            await conn.exec_driver_sql("SELECT 1")
    except Exception as exc:
        db_ok = False
        logger.error("db_unreachable", extra={"fields": {"error": str(exc)}})

    try:
        import redis.asyncio as aioredis

        redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        await redis.ping()
        await redis.close()
    except Exception:
        redis_ok = False

    model_specs = get_registry().list_models()
    calibrator = get_calibrator()

    return ApiEnvelope(
        success=True,
        data={
            "status": "ok" if db_ok else "degraded",
            "app": settings.app_name,
            "environment": settings.app_env,
            "version": "0.1.0",
            "engine_version": ENGINE_VERSION,
            "database": "ok" if db_ok else "unreachable",
            "redis": "ok" if redis_ok else "unreachable",
            "models": "mock" if settings.use_mock_models else "real",
            "model_count": len(model_specs),
            "registered_models": _model_names(model_specs),
            "calibration": {
                "method": getattr(calibrator, "method", "identity"),
                "engine_version": ENGINE_VERSION,
            },
            "metrics": metrics.snapshot() if settings.metrics_enabled else None,
        },
    )


def _model_names(specs: list[dict]) -> list[str]:
    return sorted(f"{s['name']}:{s['version']}" for s in specs)


@router.get("/health/metrics")
async def health_metrics() -> ApiEnvelope[dict]:
    return ApiEnvelope(success=True, data=metrics.snapshot() if settings.metrics_enabled else {})

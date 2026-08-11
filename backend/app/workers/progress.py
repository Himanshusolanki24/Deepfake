from __future__ import annotations

import asyncio
import json
from typing import Any

from ..config import get_settings

settings = get_settings()

_redis_pool: Any = None


def _get_redis():
    global _redis_pool
    if _redis_pool is None:
        import redis.asyncio as aioredis

        _redis_pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_pool


async def publish_progress(analysis_id: str, stage: str, progress: int, message: str | None) -> None:
    """Publish a progress event to Redis pub/sub for the WebSocket channel."""
    try:
        redis = _get_redis()
        payload = json.dumps({
            "type": "progress",
            "analysis_id": analysis_id,
            "stage": stage,
            "progress": progress,
            "message": message,
        })
        await redis.publish(f"analysis:{analysis_id}:progress", payload)
    except Exception:
        pass  # Progress is also persisted to the DB; pub/sub is best-effort.


async def publish_completion(analysis_id: str, verdict: str, confidence: float) -> None:
    try:
        redis = _get_redis()
        payload = json.dumps({
            "type": "completed",
            "analysis_id": analysis_id,
            "verdict": verdict,
            "confidence": confidence,
        })
        await redis.publish(f"analysis:{analysis_id}:progress", payload)
    except Exception:
        pass


async def publish_error(analysis_id: str, message: str) -> None:
    try:
        redis = _get_redis()
        payload = json.dumps({"type": "error", "analysis_id": analysis_id, "message": message})
        await redis.publish(f"analysis:{analysis_id}:progress", payload)
    except Exception:
        pass


class ProgressEventStream:
    """Subscribe to progress events for a job id (Redis pub/sub fallback to empty)."""

    def __init__(self, analysis_id: str) -> None:
        self.analysis_id = analysis_id
        self._pubsub = None

    async def connect(self) -> None:
        try:
            redis = _get_redis()
            self._pubsub = redis.pubsub()
            await self._pubsub.subscribe(f"analysis:{self.analysis_id}:progress")
        except Exception:
            self._pubsub = None

    async def next_event(self, timeout: float = 15.0) -> dict | None:
        if self._pubsub is None:
            await asyncio.sleep(timeout)
            return None
        try:
            message = await self._pubsub.get_message(ignore_subscribe_messages=True, timeout=timeout)
            if message and message.get("type") == "message":
                return json.loads(message["data"])
        except Exception:
            return None
        return None

    async def close(self) -> None:
        if self._pubsub is not None:
            try:
                await self._pubsub.close()
            except Exception:
                pass

from __future__ import annotations

import asyncio
import time
from typing import Any

from ..config import get_settings
from ..core.logging import get_logger
from .celery_app import celery_app

settings = get_settings()
logger = get_logger("authentiq.tasks")


def _run_async(coro) -> Any:
    try:
        asyncio.get_running_loop()
        return asyncio.run_coroutine_threadsafe(coro, asyncio.get_event_loop())
    except RuntimeError:
        return asyncio.run(coro)


@celery_app.task(name="app.workers.tasks.process_image_analysis", bind=True)
def process_image_analysis(self, analysis_id: str) -> dict[str, Any]:
    from .executor import run_analysis_job

    start = time.perf_counter()
    try:
        result = asyncio.run(run_analysis_job(analysis_id))
        logger.info("task_done", extra={"fields": {"task": "image", "analysis_id": analysis_id,
                                                   "duration_s": round(time.perf_counter() - start, 2)}})
        return result
    except Exception as exc:
        self.retry(exc=exc, countdown=5, max_retries=2)


@celery_app.task(name="app.workers.tasks.process_video_analysis", bind=True)
def process_video_analysis(self, analysis_id: str) -> dict[str, Any]:
    from .executor import run_analysis_job

    try:
        return asyncio.run(run_analysis_job(analysis_id))
    except Exception as exc:
        self.retry(exc=exc, countdown=5, max_retries=2)


@celery_app.task(name="app.workers.tasks.process_audio_analysis", bind=True)
def process_audio_analysis(self, analysis_id: str) -> dict[str, Any]:
    from .executor import run_analysis_job

    try:
        return asyncio.run(run_analysis_job(analysis_id))
    except Exception as exc:
        self.retry(exc=exc, countdown=5, max_retries=2)


@celery_app.task(name="app.workers.tasks.generate_report_task")
def generate_report_task(analysis_id: str) -> dict[str, Any]:
    from ..db.database import async_session_factory
    from ..services.report_service import ReportService
    from ..services.storage_service import StorageService

    async def _generate() -> dict[str, Any]:
        async with async_session_factory() as session:
            service = ReportService(session, StorageService.from_settings())
            html_doc, pdf = await service.generate_html(analysis_id)
            return {"analysis_id": analysis_id, "html_length": len(html_doc), "pdf_length": len(pdf)}

    return asyncio.run(_generate())


# ---------------------------------------------------------------- in-process
_running_tasks: set[asyncio.Task] = set()


async def enqueue_in_process(analysis_id: str, media_type: str) -> None:
    """Run the analysis pipeline in the current process without Celery/Redis.

    A strong reference is held in `_running_tasks` so the event loop does not
    garbage-collect the task before it completes.
    """
    from .executor import run_analysis_job

    async def _runner() -> None:
        try:
            await run_analysis_job(analysis_id)
        except Exception as exc:  # pragma: no cover
            logger.exception("in_process_task_failed", exc_info=exc)
        finally:
            _running_tasks.discard(task)

    task = asyncio.get_running_loop().create_task(_runner())
    _running_tasks.add(task)


def enqueue_task(analysis_id: str, media_type: str) -> dict[str, Any]:
    """Dispatch a job: Celery when configured, otherwise in-process."""
    if settings.use_in_process_tasks:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # Called from a sync context (unlikely): fall back to Celery.
            return _dispatch_celery(analysis_id, media_type)
        _task = loop.create_task(enqueue_in_process(analysis_id, media_type))
        _running_tasks.add(_task)
        return {"mode": "in_process"}

    return _dispatch_celery(analysis_id, media_type)


def _dispatch_celery(analysis_id: str, media_type: str) -> dict[str, Any]:
    task_map = {
        "image": process_image_analysis,
        "video": process_video_analysis,
        "audio": process_audio_analysis,
    }
    task = task_map.get(media_type)
    if task is None:
        raise ValueError(f"Unknown media type for task dispatch: {media_type}")
    result = task.delay(analysis_id)
    return {"mode": "celery", "task_id": result.id}

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..core.logging import analysis_id_var, get_logger
from ..db.enums import AnalysisStatus
from ..db.models import Analysis, AnalysisJob
from ..forensic.pipeline import AnalysisPipeline
from ..services.analysis_service import AnalysisService
from ..services.storage_service import StorageService
from .progress import publish_completion, publish_error, publish_progress

settings = get_settings()
logger = get_logger("authentiq.worker")


async def run_analysis_job(analysis_id: str) -> dict[str, Any]:
    """Execute a full forensic pipeline for an analysis and persist results."""
    from ..db.database import async_session_factory

    analysis_id_var.set(analysis_id)
    start = time.perf_counter()
    async with async_session_factory() as session:
        service = AnalysisService(session, StorageService.from_settings())
        analysis = await service.get(analysis_id)
        if analysis.status not in (AnalysisStatus.queued, AnalysisStatus.uploading,
                                   AnalysisStatus.created, AnalysisStatus.processing):
            return {"analysis_id": analysis_id, "status": analysis.status.value,
                    "skipped": True}

        job = await _ensure_job(session, analysis_id, "process_analysis", analysis.media_type.value)
        await _mark_job_started(session, job.id)
        await service.transition(analysis, AnalysisStatus.processing)

        media_path = None
        try:
            if not analysis.media:
                await service.fail(analysis_id, "NO_MEDIA", "Analysis has no media file.")
                await publish_error(analysis_id, "Analysis has no media file.")
                return {"analysis_id": analysis_id, "status": "failed"}

            media = await _load_media(session, analysis)
            media_path = media["path"]

            progress = _build_progress_callback(analysis_id, session)
            pipeline = AnalysisPipeline(StorageService.from_settings(), progress=progress)
            outcome = await pipeline.run(media_path, analysis.media_type.value, analysis_id)

            await service.transition(analysis, AnalysisStatus.fusing)
            await service.save_pipeline_results(analysis, outcome)
            await service.transition(analysis, AnalysisStatus.calibrating)
            await service.finalize(analysis, outcome)
            await publish_completion(
                analysis_id, outcome.verdict or "inconclusive",
                outcome.calibrated.get("calibrated_probability", 0.0),
            )
            logger.info(
                "analysis_completed",
                extra={"fields": {
                    "analysis_id": analysis_id,
                    "media_type": analysis.media_type.value,
                    "verdict": outcome.verdict,
                    "duration_s": round(time.perf_counter() - start, 2),
                }},
            )
            await _mark_job_done(session, job.id)
            return {"analysis_id": analysis_id, "status": "completed",
                    "verdict": outcome.verdict}
        except Exception as exc:
            logger.exception("analysis_failed", exc_info=exc)
            await service.fail(analysis_id, "PIPELINE_ERROR", str(exc)[:500])
            await publish_error(analysis_id, f"Analysis failed: {exc}")
            await _mark_job_failed(session, job.id, str(exc)[:500])
            return {"analysis_id": analysis_id, "status": "failed"}


def _build_progress_callback(analysis_id: str, session: AsyncSession):
    from ..db.database import async_session_factory

    last_pct = {"value": -1}

    async def callback(stage: str, pct: int, message: str | None) -> None:
        if pct == last_pct["value"]:
            return
        last_pct["value"] = pct
        try:
            async with async_session_factory() as write_session:
                service = AnalysisService(write_session, StorageService.from_settings())
                await service.record_progress(analysis_id, stage, pct, message)
        except Exception:
            pass
        await publish_progress(analysis_id, stage, pct, message)

    return callback


async def _ensure_job(session: AsyncSession, analysis_id: str, task_name: str, queue: str) -> AnalysisJob:
    from sqlalchemy import select

    from ..db.models import AnalysisJob

    job = await session.scalar(
        select(AnalysisJob).where(AnalysisJob.analysis_id == analysis_id).limit(1)
    )
    if job is None:
        job = AnalysisJob(
            analysis_id=analysis_id, task_name=task_name, queue=queue, status="pending"
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)
    return job


async def _mark_job_started(session: AsyncSession, job_id: str) -> None:
    from ..db.models import AnalysisJob

    job = await session.get(AnalysisJob, job_id)
    if job:
        job.status = "running"
        job.started_at = datetime.now(UTC)
        job.attempts += 1
        await session.commit()


async def _mark_job_done(session: AsyncSession, job_id: str) -> None:
    from ..db.models import AnalysisJob

    job = await session.get(AnalysisJob, job_id)
    if job:
        job.status = "succeeded"
        job.finished_at = datetime.now(UTC)
        await session.commit()


async def _mark_job_failed(session: AsyncSession, job_id: str, error: str) -> None:
    from ..db.models import AnalysisJob

    job = await session.get(AnalysisJob, job_id)
    if job:
        job.status = "failed"
        job.finished_at = datetime.now(UTC)
        job.error_message = error
        await session.commit()


async def _load_media(session: AsyncSession, analysis: Analysis) -> dict[str, str]:
    """Write the media bytes to a temp file for the pipeline."""
    import tempfile
    from pathlib import Path

    from ..services.media_service import MediaService

    storage = StorageService.from_settings()
    media_service = MediaService(storage)
    data = await media_service.load_for_analysis(analysis)
    ext = Path(analysis.media.original_filename).suffix or ".bin"
    tmp = tempfile.NamedTemporaryFile(prefix="authentiq-", suffix=ext, delete=False)
    tmp.write(data)
    tmp.close()
    return {"path": tmp.name}

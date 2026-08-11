from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions import (
    AnalysisNotFoundError,
    InvalidMediaError,
    UnsupportedMediaError,
)
from ..db.database import get_db_session
from ..db.enums import AnalysisStatus
from ..dependencies import Principal, get_optional_user
from ..schemas.reports import AnalysisResponse
from ..services.analysis_service import AnalysisService
from ..services.media_service import MediaService
from ..services.storage_service import StorageService
from ..workers.tasks import enqueue_task

router = APIRouter(tags=["frontend-compat"])

STAGE_LABELS = {
    "UPLOAD": "Media ingestion",
    "VALIDATION": "File integrity verification",
    "MEDIA_EXTRACTION": "Frame extraction",
    "FACE_DETECTION": "Face detection",
    "SPATIAL_ANALYSIS": "Spatial artifact analysis",
    "FREQUENCY_ANALYSIS": "Frequency-domain analysis",
    "TEMPORAL_ANALYSIS": "Temporal consistency",
    "AUDIO_ANALYSIS": "Spectral analysis",
    "METADATA_ANALYSIS": "Metadata inspection",
    "AV_SYNC": "Audio-visual sync",
    "RPPG": "Physiological signals",
    "PROSODY": "Prosody analysis",
    "EVIDENCE_FUSION": "Evidence fusion",
    "CALIBRATION": "Calibration",
    "FINALIZING": "Finalizing",
    "COMPLETED": "Complete",
}

STEP_ORDER = [
    "Media ingestion",
    "File integrity verification",
    "Frame extraction",
    "Face detection",
    "Spatial artifact analysis",
    "Frequency-domain analysis",
    "Temporal consistency",
    "Metadata inspection",
    "Evidence fusion",
]


@router.post("/analyze/{media_type}")
async def compat_create_analysis(
    media_type: str,
    request: Request,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict:
    """Frontend-compatible analysis creation. Accepts JSON metadata body only."""
    from ..schemas.media import MediaUploadRequest

    if media_type not in ("image", "video", "audio"):
        raise UnsupportedMediaError(message=f"Unsupported media type: {media_type}")
    try:
        body = await request.json()
    except Exception as exc:
        raise InvalidMediaError(message="Invalid JSON body.") from exc
    try:
        parsed = MediaUploadRequest.model_validate({"media_type": media_type, **body})
    except Exception as exc:
        raise InvalidMediaError(message="Invalid request body.", details=str(exc)) from exc

    storage = StorageService.from_settings()
    analysis_service = AnalysisService(session, storage)
    media_service = MediaService(storage)

    analysis = await analysis_service.create_analysis(
        media_type=media_type,
        owner_id=principal.owner_id,
        idempotency_key=idempotency_key,
    )
    media = await media_service.generate_placeholder(analysis, media_type, parsed.filename)
    await analysis_service.save_media(analysis, media)
    await analysis_service.transition(analysis, AnalysisStatus.queued)
    enqueue_task(str(analysis.id), media_type)

    return {"id": str(analysis.id)}


@router.get("/analysis/history")
async def compat_get_history(
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[AnalysisResponse]:
    service = AnalysisService(session, StorageService.from_settings())
    rows = await service.list_history(principal.owner_id, limit=50)
    return [await service.to_response(a) for a in rows]


@router.get("/analysis/batch")
async def compat_get_batch(
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[AnalysisResponse]:
    service = AnalysisService(session, StorageService.from_settings())
    rows = await service.list_history(principal.owner_id, limit=8)
    return [await service.to_response(a) for a in rows]


@router.get("/analysis/{analysis_id}")
async def compat_get_analysis(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisResponse:
    service = AnalysisService(session, StorageService.from_settings())
    analysis = await service.get_owned(analysis_id, principal.owner_id)
    return await service.to_response(analysis)


@router.get("/analysis/{analysis_id}/progress")
async def compat_get_progress(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    service = AnalysisService(session, StorageService.from_settings())
    analysis = await service.get_owned(analysis_id, principal.owner_id)
    events = await service.get_progress_events(analysis_id)

    seen: set[str] = set()
    result: list[dict] = []
    for e in events:
        label = STAGE_LABELS.get(e.stage, e.stage)
        if label in seen:
            continue
        seen.add(label)
        result.append({
            "step": label,
            "status": "done",
            "progress": e.progress,
            "detail": e.message,
        })
    # Mark the last emitted step as active if still running.
    if result and analysis.status not in (AnalysisStatus.completed, AnalysisStatus.failed, AnalysisStatus.cancelled):
        result[-1]["status"] = "active"
    return result


@router.get("/media/{folder}/{analysis_id}/{filename}")
async def compat_media(
    folder: str,
    analysis_id: str,
    filename: str,
) -> Response:
    """Serve stored artifacts/heatmaps/spectra to the frontend."""
    from fastapi.responses import Response

    from ..utils.files import detect_mime_by_extension

    storage = StorageService.from_settings()
    key = f"{folder}/{analysis_id}/{filename}"
    try:
        data = await storage.get(key)
    except Exception as exc:
        raise AnalysisNotFoundError(message="Media artifact not found.") from exc
    mime = detect_mime_by_extension(filename) or "application/octet-stream"
    return Response(content=data, media_type=mime)




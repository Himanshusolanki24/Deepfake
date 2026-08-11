from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, Request, Response
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..core.exceptions import InvalidMediaError, UnsupportedMediaError
from ..core.logging import get_logger
from ..db.database import get_db_session
from ..db.enums import AnalysisStatus
from ..dependencies import Principal, get_optional_user
from ..schemas.common import ApiEnvelope
from ..schemas.media import MediaUploadResponse
from ..services.analysis_service import AnalysisService
from ..services.media_service import MediaService
from ..services.storage_service import StorageService
from ..workers.tasks import enqueue_task

settings = get_settings()
router = APIRouter(tags=["analyze"])
logger = get_logger("authentiq.upload")


@router.post("/analyze/{media_type}")
async def create_analysis(
    media_type: str,
    request: Request,
    response: Response,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> ApiEnvelope[MediaUploadResponse]:
    """Create and enqueue an analysis.

    Accepts either a multipart file upload or a JSON body with media metadata
    (used by the frontend demo flow when no file is attached).
    """
    if media_type not in ("image", "video", "audio"):
        raise UnsupportedMediaError(message=f"Unsupported media type: {media_type}")

    storage = StorageService.from_settings()
    analysis_service = AnalysisService(session, storage)
    media_service = MediaService(storage)

    content_type = request.headers.get("content-type", "").lower()
    is_multipart = content_type.startswith("multipart/form-data")
    is_json = content_type.startswith("application/json")

    try:
        if is_multipart:
            form = await request.form()
            upload = form.get("file")
            if upload is None:
                raise InvalidMediaError(message="No file part named 'file' in the upload.")
            data = await upload.read()
            filename = getattr(upload, "filename", None) or "upload.bin"
        elif is_json:
            body = await request.json()
            from ..schemas.media import MediaUploadRequest

            try:
                parsed = MediaUploadRequest.model_validate({"media_type": media_type, **body})
            except ValidationError as exc:
                raise InvalidMediaError(message="Invalid request body.", details=exc.errors()) from exc
            data = None
            filename = parsed.filename or "upload.bin"
            # When a real file was declared (size > 0) but not attached, we still
            # proceed in metadata-only demo mode so the frontend flow completes.
        else:
            raise UnsupportedMediaError(message="Content-Type must be multipart/form-data or application/json.")
    except InvalidMediaError:
        raise
    except UnsupportedMediaError:
        raise
    except Exception as exc:
        logger.exception("upload_parse_failed", exc_info=exc)
        raise InvalidMediaError(message="Could not parse upload body.") from exc

    # Validate the media payload when a file is present.
    detected_mime: str | None = None
    if data is not None and len(data) > 0:
        detected_mime = media_service.validate_upload(data, filename, None, media_type)
    else:
        from ..utils.files import detect_mime_by_extension

        detected_mime = detect_mime_by_extension(filename)
        if detected_mime is None or not is_supported_mime(detected_mime, media_type):
            # Fall back to a supported MIME for the declared type so demo flows run.
            detected_mime = {
                "image": "image/png",
                "video": "video/mp4",
                "audio": "audio/wav",
            }[media_type]
        if data is None:
            data = b""

    analysis = await analysis_service.create_analysis(
        media_type=media_type,
        owner_id=principal.owner_id,
        idempotency_key=idempotency_key,
    )

    if data and len(data) > 0:
        media = await media_service.store_upload(analysis, data, filename, detected_mime)
    else:
        media = await media_service.generate_placeholder(analysis, media_type, filename)
    await analysis_service.save_media(analysis, media)

    await analysis_service.transition(analysis, AnalysisStatus.queued)

    dispatch = enqueue_task(str(analysis.id), media_type)

    response.headers["Location"] = f"{settings.api_prefix}/analysis/{analysis.id}"
    logger.info("analysis_enqueued", extra={"fields": {
        "analysis_id": str(analysis.id), "media_type": media_type, "mode": dispatch.get("mode"),
        "sha256": media.sha256[:12],
    }})

    return ApiEnvelope(
        success=True,
        data=MediaUploadResponse(
            id=str(analysis.id),
            media_type=media_type,
            status="queued",
            media_sha256=media.sha256,
            uploaded=data is not None and len(data) > 0,
        ),
    )


def _parse_signals(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(s) for s in raw]
    if isinstance(raw, str):
        import json

        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(s) for s in parsed]
        except Exception:
            return [s.strip() for s in raw.split(",") if s.strip()]
    return []


def is_supported_mime(mime: str, media_type: str) -> bool:
    from ..utils.files import is_supported

    return is_supported(mime, media_type)



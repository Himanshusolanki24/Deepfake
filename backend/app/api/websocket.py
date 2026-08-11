from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..core.logging import get_logger
from ..db.database import async_session_factory
from ..services.analysis_service import AnalysisService
from ..services.storage_service import StorageService
from ..workers.progress import ProgressEventStream

router = APIRouter(tags=["websocket"])
logger = get_logger("authentiq.ws")


@router.websocket("/ws/analysis/{job_id}")
async def analysis_ws(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()
    stream = ProgressEventStream(job_id)
    await stream.connect()

    # Send the current snapshot immediately so clients render fast.
    try:
        async with async_session_factory() as session:
            service = AnalysisService(session, StorageService.from_settings())
            try:
                analysis = await service.get(job_id)
                latest = await service.latest_progress(job_id)
                await websocket.send_json({
                    "type": "snapshot",
                    "analysis_id": job_id,
                    "status": analysis.status.value,
                    "stage": latest.stage if latest else None,
                    "progress": latest.progress if latest else 0,
                })
            except Exception:
                pass
    except Exception:
        pass

    try:
        while True:
            event = await stream.next_event(timeout=10.0)
            if event is None:
                # Heartbeat to keep the connection alive while idle.
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
                continue
            await websocket.send_json(event)
            if event.get("type") in ("completed", "error"):
                break
    except WebSocketDisconnect:
        logger.info("ws_disconnect", extra={"fields": {"job_id": job_id}})
    except Exception:
        logger.exception("ws_error", extra={"fields": {"job_id": job_id}})
    finally:
        await stream.close()
        try:
            await websocket.close()
        except Exception:
            pass

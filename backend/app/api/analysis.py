from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db_session
from ..dependencies import Principal, get_optional_user
from ..schemas.common import ApiEnvelope
from ..schemas.evidence import EvidenceItem, SuspiciousFrameItem
from ..schemas.jobs import ProgressEventOut, ProgressState
from ..schemas.reports import AnalysisResponse
from ..services.analysis_service import AnalysisService
from ..services.evidence_service import EvidenceService
from ..services.report_service import ReportService
from ..services.storage_service import StorageService

router = APIRouter(tags=["analysis"])


@router.get("/analysis/history")
async def get_history(
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
    media_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ApiEnvelope[list[AnalysisResponse]]:
    service = AnalysisService(session, StorageService.from_settings())
    rows = await service.list_history(principal.owner_id, limit=limit, offset=offset, media_type=media_type)
    items = [await service.to_response(a) for a in rows]
    return ApiEnvelope(success=True, data=items)


@router.get("/analysis/batch")
async def get_batch_history(
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(default=8, ge=1, le=50),
) -> ApiEnvelope[list[AnalysisResponse]]:
    service = AnalysisService(session, StorageService.from_settings())
    rows = await service.list_history(principal.owner_id, limit=limit)
    items = [await service.to_response(a) for a in rows]
    return ApiEnvelope(success=True, data=items)


@router.get("/analysis/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> ApiEnvelope[AnalysisResponse]:
    service = AnalysisService(session, StorageService.from_settings())
    analysis = await service.get_owned(analysis_id, principal.owner_id)
    return ApiEnvelope(success=True, data=await service.to_response(analysis))


@router.get("/analysis/{analysis_id}/progress")
async def get_progress(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> ApiEnvelope[ProgressState]:
    service = AnalysisService(session, StorageService.from_settings())
    analysis = await service.get_owned(analysis_id, principal.owner_id)
    events = await service.get_progress_events(analysis_id)
    latest = await service.latest_progress(analysis_id)
    return ApiEnvelope(
        success=True,
        data=ProgressState(
            analysis_id=analysis_id,
            status=analysis.status.value,
            current_stage=latest.stage if latest else None,
            progress=latest.progress if latest else 0,
            events=[
                ProgressEventOut(stage=e.stage, progress=e.progress, message=e.message)
                for e in events
            ],
        ),
    )


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> ApiEnvelope[dict]:
    service = AnalysisService(session, StorageService.from_settings())
    await service.delete(analysis_id, principal.owner_id)
    return ApiEnvelope(success=True, data={"deleted": True, "id": analysis_id})


@router.get("/analysis/{analysis_id}/evidence")
async def get_evidence(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> ApiEnvelope[dict]:
    service = AnalysisService(session, StorageService.from_settings())
    await service.get_owned(analysis_id, principal.owner_id)
    evidence_service = EvidenceService(session)
    evidence: list[EvidenceItem] = await evidence_service.list_evidence(analysis_id)
    frames: list[SuspiciousFrameItem] = await evidence_service.list_suspicious_frames(analysis_id)
    return ApiEnvelope(
        success=True,
        data={
            "analysis_id": analysis_id,
            "evidence": [e.model_dump() for e in evidence],
            "suspicious_frames": [f.model_dump() for f in frames],
        },
    )


@router.get("/analysis/{analysis_id}/report")
async def get_report(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    service = ReportService(session, StorageService.from_settings())
    analysis_service = AnalysisService(session, StorageService.from_settings())
    await analysis_service.get_owned(analysis_id, principal.owner_id)
    html_doc, _ = await service.generate_html(analysis_id)
    return Response(content=html_doc, media_type="text/html")


@router.get("/analysis/{analysis_id}/report/pdf")
async def get_report_pdf(
    analysis_id: str,
    principal: Principal = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    service = ReportService(session, StorageService.from_settings())
    analysis_service = AnalysisService(session, StorageService.from_settings())
    await analysis_service.get_owned(analysis_id, principal.owner_id)
    pdf = await service.generate_pdf(analysis_id)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="authentiq-report-{analysis_id}.pdf"'},
    )



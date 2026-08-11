from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions import AnalysisNotFoundError
from ..db.models import Evidence, SuspiciousFrame
from ..schemas.evidence import EvidenceItem, SuspiciousFrameItem


class EvidenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_evidence(self, analysis_id: str) -> list[EvidenceItem]:
        stmt = (
            select(Evidence)
            .where(Evidence.analysis_id == analysis_id)
            .order_by(Evidence.created_at.asc())
        )
        items = (await self.session.scalars(stmt)).all()
        if not items:
            # An analysis may exist with no evidence rows yet.
            from ..db.models import Analysis

            exists = await self.session.get(Analysis, analysis_id)
            if exists is None:
                raise AnalysisNotFoundError()
        return [
            EvidenceItem(
                id=str(e.id),
                signal_type=e.signal_type,
                kind=e.kind,
                label=e.label,
                score=e.score,
                confidence=e.confidence,
                severity=e.severity,
                explanation=e.explanation,
                timestamp_start=e.timestamp_start,
                timestamp_end=e.timestamp_end,
                frame_number=e.frame_number,
                artifact_uri=e.artifact_uri,
                metadata=_safe_json(e.metadata_json),
            )
            for e in items
        ]

    async def list_suspicious_frames(self, analysis_id: str) -> list[SuspiciousFrameItem]:
        stmt = (
            select(SuspiciousFrame)
            .where(SuspiciousFrame.analysis_id == analysis_id)
            .order_by(SuspiciousFrame.timestamp.asc())
        )
        rows = (await self.session.scalars(stmt)).all()
        return [
            SuspiciousFrameItem(
                frame_number=r.frame_number, timestamp=r.timestamp,
                score=r.score, reason=r.reason,
            )
            for r in rows
        ]


def _safe_json(value: str | None) -> dict:
    import json

    if not value:
        return {}
    try:
        return json.loads(value)
    except Exception:
        return {}

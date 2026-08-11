from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions import (
    AnalysisNotFoundError,
    InvalidStateTransitionError,
)
from ..db.enums import AnalysisStatus, Verdict
from ..db.models import (
    Analysis,
    Evidence,
    MediaFile,
    MetadataRecord,
    ProgressEvent,
    SignalResult,
    SuspiciousFrame,
)
from ..schemas.analysis import (
    Assessment,
    MediaInfo,
    ProcessingInfo,
    SignalSummary,
)
from ..schemas.reports import (
    AnalysisResponse,
    AudioAnalysisOut,
    EvidenceOut,
    FrequencyPointOut,
    HeatmapRegionOut,
    MediaMetadataOut,
    SignalEvidence,
    SignalResultOut,
    SuspiciousFrameOut,
    SuspiciousSegment,
    TimelineEventOut,
)
from ..utils.timestamps import to_iso
from .storage_service import StorageService

if TYPE_CHECKING:
    from ..forensic.pipeline import PipelineOutcome

ALLOWED_TRANSITIONS: dict[AnalysisStatus, set[AnalysisStatus]] = {
    AnalysisStatus.created: {AnalysisStatus.uploading, AnalysisStatus.queued, AnalysisStatus.failed, AnalysisStatus.cancelled},
    AnalysisStatus.uploading: {AnalysisStatus.queued, AnalysisStatus.failed, AnalysisStatus.cancelled},
    AnalysisStatus.queued: {AnalysisStatus.processing, AnalysisStatus.failed, AnalysisStatus.cancelled},
    AnalysisStatus.processing: {AnalysisStatus.fusing, AnalysisStatus.failed, AnalysisStatus.cancelled},
    AnalysisStatus.fusing: {AnalysisStatus.calibrating, AnalysisStatus.failed, AnalysisStatus.cancelled},
    AnalysisStatus.calibrating: {AnalysisStatus.completed, AnalysisStatus.failed},
    AnalysisStatus.completed: set(),
    AnalysisStatus.failed: set(),
    AnalysisStatus.cancelled: set(),
}

SIGNAL_NAMES = {
    "spatial": "Spatial artifacts",
    "frequency": "Frequency analysis",
    "temporal": "Temporal consistency",
    "physiological": "Physiological signals",
    "av-sync": "Audio-visual synchronization",
    "metadata": "Metadata & provenance",
    "voice-spectral": "Voice spectral analysis",
}


class AnalysisService:
    def __init__(self, session: AsyncSession, storage: StorageService) -> None:
        self.session = session
        self.storage = storage

    # ------------------------------------------------------------ lifecycle
    async def create_analysis(
        self,
        media_type: str,
        owner_id: str,
        *,
        idempotency_key: str | None = None,
        media_sha256: str | None = None,
    ) -> Analysis:
        if idempotency_key:
            existing = await self.session.scalar(
                select(Analysis).where(
                    Analysis.idempotency_key == idempotency_key,
                    Analysis.owner_id == owner_id,
                )
            )
            if existing:
                raise InvalidStateTransitionError(
                    code="IDEMPOTENCY_CONFLICT",
                    message="A request with this idempotency key already exists.",
                )
        analysis = Analysis(
            user_id=None,
            owner_id=owner_id,
            media_type=media_type,
            status=AnalysisStatus.created,
            media_sha256=media_sha256,
            idempotency_key=idempotency_key,
        )
        self.session.add(analysis)
        await self.session.commit()
        await self.session.refresh(analysis)
        return analysis

    async def transition(self, analysis: Analysis, new_status: AnalysisStatus) -> None:
        current = analysis.status
        if new_status not in ALLOWED_TRANSITIONS.get(current, set()):
            raise InvalidStateTransitionError(
                message=f"Invalid state transition: {current.value} -> {new_status.value}"
            )
        analysis.status = new_status
        if new_status == AnalysisStatus.completed:
            analysis.completed_at = datetime.now(UTC)
        await self.session.commit()

    async def fail(self, analysis_id: str, code: str, message: str) -> None:
        analysis = await self.get(analysis_id)
        analysis.status = AnalysisStatus.failed
        analysis.error_code = code
        analysis.error_message = message
        await self.session.commit()

    async def get(self, analysis_id: str) -> Analysis:
        analysis = await self.session.get(Analysis, analysis_id)
        if analysis is None:
            raise AnalysisNotFoundError()
        return analysis

    async def get_owned(self, analysis_id: str, owner_id: str) -> Analysis:
        analysis = await self.get(analysis_id)
        if analysis.owner_id != owner_id:
            from ..core.exceptions import AuthorizationError

            raise AuthorizationError()
        return analysis

    async def list_history(self, owner_id: str, *, limit: int = 50, offset: int = 0,
                           media_type: str | None = None) -> list[Analysis]:
        stmt = select(Analysis).where(Analysis.owner_id == owner_id)
        if media_type:
            stmt = stmt.where(Analysis.media_type == media_type)
        stmt = stmt.order_by(Analysis.created_at.desc()).limit(limit).offset(offset)
        return list((await self.session.scalars(stmt)).all())

    async def count_analyses(self) -> int:
        return int((await self.session.scalar(select(func.count()).select_from(Analysis))) or 0)

    async def delete(self, analysis_id: str, owner_id: str) -> None:
        analysis = await self.get_owned(analysis_id, owner_id)
        keys: list[str] = []
        if analysis.media:
            keys.append(analysis.media.storage_key)
        for evidence in analysis.evidence:
            if evidence.artifact_uri:
                keys.append(_uri_to_key(evidence.artifact_uri))
        for key in keys:
            try:
                await self.storage.delete(key)
            except Exception:
                pass
        await self.session.delete(analysis)
        await self.session.commit()

    # ------------------------------------------------------------ persistence
    async def save_media(self, analysis: Analysis, media: MediaFile) -> None:
        analysis.media = media
        analysis.media_sha256 = media.sha256
        analysis.status = AnalysisStatus.uploading
        await self.session.commit()

    async def save_pipeline_results(self, analysis: Analysis, outcome: PipelineOutcome) -> None:
        for signal in outcome.signals:
            self.session.add(SignalResult(
                analysis_id=str(analysis.id),
                signal_type=signal.signal_type,
                score=signal.score,
                confidence=signal.confidence,
                severity=signal.severity,
                status=signal.status,
                explanation=signal.explanation,
                model_version=signal.model_version,
                details=json.dumps(signal.details) if signal.details else None,
            ))
        for ev in outcome.evidence:
            self.session.add(Evidence(
                analysis_id=str(analysis.id),
                signal_type=ev.get("signal_type", ""),
                score=ev.get("score"),
                confidence=ev.get("confidence"),
                severity=ev.get("severity", "low"),
                kind=ev.get("kind", "frame"),
                label=ev.get("label", ""),
                explanation=ev.get("explanation", ""),
                timestamp_start=ev.get("timestamp_start"),
                timestamp_end=ev.get("timestamp_end"),
                frame_number=ev.get("frame_number"),
                artifact_uri=ev.get("artifact_uri"),
                metadata=json.dumps(ev.get("metadata", {})),
            ))
        for sf in outcome.suspicious_frames:
            self.session.add(SuspiciousFrame(
                analysis_id=str(analysis.id),
                frame_number=sf.get("frame_number", 0),
                timestamp=sf.get("timestamp", 0.0),
                score=sf.get("score", 0.0),
                reason=sf.get("reason", ""),
            ))
        if outcome.metadata_record:
            self.session.add(MetadataRecord(
                analysis_id=str(analysis.id),
                raw=json.dumps(outcome.metadata_record.get("raw", {})),
                exif_status=outcome.metadata_record.get("exif_status", "absent"),
                double_compression=outcome.metadata_record.get("double_compression", False),
                suspicious_software=outcome.metadata_record.get("suspicious_software", False),
                c2pa_status=outcome.metadata_record.get("c2pa_status", "not-present"),
                ela_score=outcome.metadata_record.get("ela_score"),
            ))
        await self.session.commit()

    async def finalize(self, analysis: Analysis, outcome: PipelineOutcome) -> None:
        cal = outcome.calibrated
        analysis.raw_probability = outcome.fused_probability
        analysis.calibrated_probability = cal.get("calibrated_probability")
        analysis.ci_lower = cal.get("ci_lower")
        analysis.ci_upper = cal.get("ci_upper")
        analysis.confidence = cal.get("calibrated_probability")
        analysis.verdict = outcome.verdict or Verdict.inconclusive.value
        analysis.explanation = outcome.explanation
        analysis.total_duration_ms = outcome.duration_ms
        analysis.model_set = ",".join(f"{k}:{v}" for k, v in outcome.models.items())
        analysis.completed_at = datetime.now(UTC)
        analysis.status = AnalysisStatus.completed
        await self.session.commit()

    async def record_progress(self, analysis_id: str, stage: str, progress: int, message: str | None) -> None:
        self.session.add(ProgressEvent(analysis_id=analysis_id, stage=stage, progress=progress, message=message))
        await self.session.commit()

    async def get_progress_events(self, analysis_id: str) -> list[ProgressEvent]:
        stmt = (
            select(ProgressEvent)
            .where(ProgressEvent.analysis_id == analysis_id)
            .order_by(ProgressEvent.created_at.asc())
        )
        return list((await self.session.scalars(stmt)).all())

    async def latest_progress(self, analysis_id: str) -> ProgressEvent | None:
        stmt = (
            select(ProgressEvent)
            .where(ProgressEvent.analysis_id == analysis_id)
            .order_by(ProgressEvent.created_at.desc())
            .limit(1)
        )
        return await self.session.scalar(stmt)

    # ------------------------------------------------------------ serialization
    async def to_response(self, analysis: Analysis) -> AnalysisResponse:
        media = analysis.media
        metadata_out = None
        if analysis.metadata_record:
            raw = json.loads(analysis.metadata_record.raw or "{}")
            metadata_out = MediaMetadataOut(
                filename=media.original_filename if media else raw.get("filename", ""),
                mimeType=media.mime_type if media else raw.get("mime", ""),
                fileSize=media.size_bytes if media else raw.get("size_bytes", 0),
                dimensions=raw.get("dimensions"),
                codec=media.codec if media else raw.get("codec"),
                duration=media.duration_seconds if media else raw.get("duration"),
                creationTimestamp=raw.get("creation_time"),
                modificationTimestamp=raw.get("modification_time"),
                software=raw.get("software"),
                exifStatus=analysis.metadata_record.exif_status,
                c2pa={"status": analysis.metadata_record.c2pa_status},
                location=raw.get("location"),
                deviceModel=raw.get("device_model"),
                camera=raw.get("camera"),
            )

        signals = [self._signal_out(s) for s in analysis.signals]

        evidence_out = []
        for ev in analysis.evidence:
            evidence_out.append(EvidenceOut(
                id=str(ev.id),
                signal_type=ev.signal_type,
                kind=ev.kind,
                label=ev.label,
                score=ev.score,
                confidence=ev.confidence,
                severity=ev.severity,
                explanation=ev.explanation,
                timestamp_start=ev.timestamp_start,
                timestamp_end=ev.timestamp_end,
                frame_number=ev.frame_number,
                artifact_uri=ev.artifact_uri,
                metadata=json.loads(ev.metadata_json or "{}"),
            ))

        freq_data = [
            FrequencyPointOut(**p) for p in _frequency_data_from_signals(analysis.signals)
        ]
        heatmap_regions = _heatmap_regions_from_signals(analysis.signals)

        audio_analysis = _audio_analysis_from_signals(analysis.signals)

        timeline = self._build_timeline(analysis)

        artifacts = {}
        for ev in analysis.evidence:
            if ev.kind == "heatmap" and ev.artifact_uri:
                artifacts["heatmap"] = ev.artifact_uri
            if ev.kind == "frequency-plot" and ev.artifact_uri:
                artifacts["frequency_spectrum"] = ev.artifact_uri
        if audio_analysis:
            for ev in analysis.evidence:
                if ev.kind == "spectrogram" and ev.artifact_uri:
                    artifacts["spectrogram"] = ev.artifact_uri

        signal_breakdown = {}
        for s in analysis.signals:
            signal_breakdown[s.signal_type] = SignalSummary(
                score=s.score, confidence=s.confidence, severity=s.severity,
                status=s.status, explanation=s.explanation, model_version=s.model_version,
            )

        media_info = None
        if media:
            media_info = MediaInfo(
                type=analysis.media_type,
                filename=media.original_filename,
                original_filename=media.original_filename,
                mime_type=media.mime_type,
                sha256=media.sha256,
                size_bytes=media.size_bytes,
                duration=media.duration_seconds,
                width=media.width,
                height=media.height,
                codec=media.codec,
            )

        assessment = Assessment(
            verdict=analysis.verdict or "inconclusive",
            probability=analysis.calibrated_probability or 0.0,
            raw_probability=analysis.raw_probability,
            confidence_interval=(
                {"lower": analysis.ci_lower, "upper": analysis.ci_upper}
                if analysis.ci_lower is not None and analysis.ci_upper is not None else None
            ),
            explanation=analysis.explanation or "",
        )

        model_dict = {}
        if analysis.model_set:
            for part in analysis.model_set.split(","):
                if ":" in part:
                    k, v = part.split(":", 1)
                    model_dict[k] = v

        confidence_interval = (
            {"lower": analysis.ci_lower, "upper": analysis.ci_upper}
            if analysis.ci_lower is not None and analysis.ci_upper is not None else None
        )

        return AnalysisResponse(
            id=str(analysis.id),
            mediaType=analysis.media_type,
            filename=media.original_filename if media else "",
            previewUrl=self.storage.url(media.storage_key) if media else None,
            verdict=analysis.verdict or "inconclusive",
            confidence=analysis.calibrated_probability or 0.0,
            confidenceInterval=confidence_interval,
            explanation=analysis.explanation or "",
            signals=signals,
            suspiciousFrames=[
                SuspiciousFrameOut(
                    frame=sf.frame_number, timestamp=sf.timestamp,
                    score=sf.score, reason=sf.reason,
                )
                for sf in analysis.suspicious_frames
            ],
            frequencyData=freq_data,
            heatmapRegions=heatmap_regions,
            timeline=timeline,
            metadata=metadata_out,
            audioAnalysis=audio_analysis,
            processingTime=analysis.total_duration_ms,
            status=_map_status(analysis.status),
            createdAt=to_iso(analysis.created_at) or "",
            assessment=assessment.model_dump(),
            media=media_info.model_dump() if media_info else None,
            evidence=evidence_out,
            suspicious_segments=[
                SuspiciousSegment(start=s.get("start", 0.0), end=s.get("end", 0.0), score=s.get("score", 0.0))
                for s in _segments_from_signals(analysis.signals)
            ],
            artifacts=artifacts,
            models=model_dict,
            processing=ProcessingInfo(
                duration_ms=analysis.total_duration_ms,
                completed_at=to_iso(analysis.completed_at),
            ).model_dump() if analysis.completed_at else None,
            limitations=[
                "Low-quality input may reduce detector reliability.",
                "Novel generation methods may evade existing detectors.",
                "Metadata absence is not proof of manipulation.",
                "Physiological analysis requires sufficient facial visibility.",
                "Verdicts reflect calibrated confidence, not absolute truth.",
            ],
        )

    def _signal_out(self, s: SignalResult) -> SignalResultOut:
        details = json.loads(s.details) if s.details else {}
        evidence: list[SignalEvidence] = []
        technical = self._technical_for(s.signal_type, details)
        for ev in getattr(s, "evidence", []):
            if isinstance(ev, dict):
                evidence.append(SignalEvidence(
                    id=str(ev.get("id", "")), kind=ev.get("kind", "frame"),
                    label=ev.get("label", ""), timestamp=ev.get("timestamp"),
                    value=ev.get("value"),
                ))
        return SignalResultOut(
            id=s.signal_type,
            name=SIGNAL_NAMES.get(s.signal_type, s.signal_type),
            score=s.score,
            confidence=s.confidence,
            severity=s.severity,
            explanation=s.explanation,
            technical=technical,
            evidence=evidence,
        )

    def _technical_for(self, signal_type: str, details: dict) -> list[str]:
        if signal_type == "frequency":
            return [
                f"peak: {a['frequency_band']} band, strength {a['strength']}"
                for a in details.get("anomalies", [])
            ]
        if signal_type == "physiological":
            return [
                f"heart_rate: {details.get('heart_rate')}",
                f"signal_quality: {details.get('signal_quality')}",
            ]
        if signal_type == "av-sync":
            return [f"correlation: {details.get('correlation')}"]
        if signal_type == "voice-spectral":
            return [
                f"spectral: {details.get('spectral_score')}",
                f"prosody: {details.get('prosody_score')}",
                f"pitch: {details.get('pitch_score')}",
            ]
        return []

    def _build_timeline(self, analysis: Analysis) -> list[TimelineEventOut]:
        timeline: list[TimelineEventOut] = [TimelineEventOut(
            time="0s", title="Analysis created", severity="low",
            detail="Media queued for forensic assessment.",
        )]
        for signal in analysis.signals:
            if signal.severity == "high":
                timeline.append(TimelineEventOut(
                    time="Analysis", title=SIGNAL_NAMES.get(signal.signal_type, signal.signal_type),
                    severity="high", detail=signal.explanation[:120],
                ))
        if analysis.completed_at:
            timeline.append(TimelineEventOut(
                time="Complete", title="Assessment finalized",
                severity="medium", detail=f"Verdict: {analysis.verdict}",
            ))
        return timeline


def _frequency_data_from_signals(signals: list[SignalResult]) -> list[dict]:
    for s in signals:
        if s.signal_type == "frequency" and s.details:
            details = json.loads(s.details)
            if details.get("frequency_points"):
                return details["frequency_points"]
    return []


def _heatmap_regions_from_signals(signals: list[SignalResult]) -> list[HeatmapRegionOut]:
    regions = []
    for s in signals:
        if s.signal_type == "spatial" and s.details:
            details = json.loads(s.details)
            for r in details.get("regions", []):
                regions.append(HeatmapRegionOut(
                    x=r.get("x", 0), y=r.get("y", 0), width=r.get("width", 0),
                    height=r.get("height", 0), intensity=r.get("intensity", 0),
                    label=r.get("label", "region"),
                ))
    return regions


def _audio_analysis_from_signals(signals: list[SignalResult]) -> AudioAnalysisOut | None:
    for s in signals:
        if s.signal_type == "voice-spectral" and s.details:
            details = json.loads(s.details)
            return AudioAnalysisOut(
                spectralConsistency=details.get("spectral_score") or 0.0,
                prosody=details.get("prosody_score") or 0.0,
                pitchNaturalness=details.get("pitch_score") or 0.0,
                vocoderArtifacts=details.get("vocoder_artifacts") or 0.0,
                breathNoise=details.get("breath_noise") or 0.0,
                suspiciousSegments=[
                    SuspiciousSegment(start=seg.get("start", 0.0), end=seg.get("end", 0.0),
                                      score=seg.get("score", 0.0))
                    for seg in details.get("segments", [])
                ],
            )
    return None


def _segments_from_signals(signals: list[SignalResult]) -> list[dict]:
    segments = []
    for s in signals:
        if s.details:
            details = json.loads(s.details)
            for seg in details.get("segments", []):
                segments.append(seg)
    return segments


def _uri_to_key(uri: str) -> str:
    if "/media/" in uri:
        return uri.split("/media/", 1)[1]
    return uri


def _map_status(status: AnalysisStatus) -> str:
    return {
        AnalysisStatus.completed: "complete",
        AnalysisStatus.processing: "processing",
        AnalysisStatus.fusing: "processing",
        AnalysisStatus.calibrating: "processing",
        AnalysisStatus.queued: "queued",
        AnalysisStatus.created: "queued",
        AnalysisStatus.uploading: "processing",
        AnalysisStatus.failed: "failed",
        AnalysisStatus.cancelled: "review",
    }.get(status, "queued")

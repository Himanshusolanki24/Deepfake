from __future__ import annotations

import asyncio
import shutil
import tempfile
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..config import get_settings
from ..core.exceptions import InvalidMediaError
from ..db.enums import MediaType, SignalType
from ..forensic.evidence_engine import build_consensus, context_notes
from ..forensic.fusion.calibration import get_calibrator
from ..forensic.fusion.meta_classifier import get_meta_classifier
from ..forensic.fusion.scoring import assess, severity_for_score
from ..forensic.image.ai_generated import AIGeneratedAbstractionAnalyzer
from ..forensic.image.compression import CompressionAnalyzer
from ..forensic.image.frequency import FFTSpatialFrequencyAnalyzer
from ..forensic.image.heatmap import generate_heatmap
from ..forensic.interface import DetectorContext
from ..forensic.media.quality import (
    MediaQuality,
    assess_quality,
    degraded_confidence,
    normalize_image,
    quality_limitations,
)
from ..forensic.signals import (
    AudioResult,
    MetadataResult,
    RPPGResult,
    SignalResult,
    TemporalResult,
)
from ..forensic.video.face_tracking import FaceTrackingAnalyzer
from ..forensic.video.frame_extractor import FrameExtractor
from ..forensic.video.lighting import LightingConsistencyAnalyzer
from ..forensic.video.temporal import TemporalAnalyzer
from ..ml.inference import (
    get_audio_detector,
    get_av_sync_detector,
    get_metadata_detector,
    get_rppg_detector,
    get_spatial_detector,
)
from ..ml.model_registry import ENGINE_VERSION, get_registry
from ..services.storage_service import StorageService

settings = get_settings()

ProgressCallback = Callable[[str, int, str], Awaitable[None]]

LIMITATIONS = [
    "Low-quality input may reduce detector reliability.",
    "Novel generation methods may evade existing detectors.",
    "Metadata absence is not proof of manipulation.",
    "Physiological analysis requires sufficient facial visibility.",
    "Verdicts reflect calibrated confidence, not absolute truth.",
]


@dataclass
class PipelineOutcome:
    signals: list[SignalResult] = field(default_factory=list)
    evidence: list[dict[str, Any]] = field(default_factory=list)
    suspicious_frames: list[dict[str, Any]] = field(default_factory=list)
    suspicious_segments: list[dict[str, Any]] = field(default_factory=list)
    frequency_data: list[dict[str, Any]] = field(default_factory=list)
    heatmap_regions: list[dict[str, Any]] = field(default_factory=list)
    metadata_record: dict[str, Any] = field(default_factory=dict)
    audio_analysis: dict[str, Any] | None = None
    artifacts: dict[str, str | None] = field(default_factory=dict)
    fused_probability: float | None = None
    calibrated: dict[str, Any] = field(default_factory=dict)
    verdict: str | None = None
    explanation: str = ""
    models: dict[str, str] = field(default_factory=dict)
    duration_ms: int = 0
    media_details: dict[str, Any] = field(default_factory=dict)
    media_quality: dict[str, Any] | None = None
    cross_modal: dict[str, Any] | None = None
    engine_version: str | None = None
    uncertainty: float | None = None
    agreement_score: float | None = None


class AnalysisPipeline:
    def __init__(self, storage: StorageService, progress: ProgressCallback | None = None) -> None:
        self.storage = storage
        self.progress = progress or (lambda *_: _noop())

    async def _report(self, stage: str, pct: int, message: str) -> None:
        await self.progress(stage, pct, message)

    async def run(self, media_path: str, media_type: str, analysis_id: str) -> PipelineOutcome:
        outcome = PipelineOutcome()
        start = time.perf_counter()
        work_dir = Path(tempfile.mkdtemp(prefix="authentiq-"))
        registry = get_registry()
        outcome.models = registry.versions_used()
        outcome.engine_version = ENGINE_VERSION

        try:
            await self._report("VALIDATION", 2, "Validating media integrity")
            quality = await asyncio.to_thread(assess_quality, media_type, media_path)
            outcome.media_quality = quality.to_dict() if quality else None
            outcome.media_details["media_quality"] = outcome.media_quality

            effective_path = media_path
            if media_type == MediaType.image.value and quality and not quality.is_acceptable:
                effective_path = await asyncio.to_thread(
                    normalize_image, media_path, str(work_dir)
                )

            if media_type == MediaType.image.value:
                await self._run_image(effective_path, quality, analysis_id, outcome, work_dir)
            elif media_type == MediaType.video.value:
                await self._run_video(effective_path, quality, analysis_id, outcome, work_dir)
            elif media_type == MediaType.audio.value:
                await self._run_audio(effective_path, quality, analysis_id, outcome, work_dir)
            else:
                raise InvalidMediaError(message=f"Unknown media type: {media_type}")

            await self._fuse_and_calibrate(outcome, media_type)
            outcome.duration_ms = int((time.perf_counter() - start) * 1000)
            return outcome
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    # ------------------------------------------------------------- image
    async def _run_image(self, media_path: str, quality: MediaQuality | None, analysis_id: str,
                         outcome: PipelineOutcome, work_dir: Path) -> None:
        limitations = quality_limitations(quality)

        await self._report("SPATIAL_ANALYSIS", 20, "Analyzing spatial artifacts")
        spatial = await get_spatial_detector().analyze(media_path)
        if spatial.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.spatial.value,
                score=spatial.score,
                confidence=degraded_confidence(quality, spatial.confidence),
                severity=severity_for_score(spatial.score).value,
                explanation=spatial.explanation,
                model_version=spatial.model_version,
                details={"regions": spatial.regions},
                limitations=list(limitations),
            ))
            outcome.heatmap_regions = spatial.regions

        await self._report("COMPRESSION_ANALYSIS", 33, "Detecting compression artifacts")
        compression = await CompressionAnalyzer().analyze(DetectorContext.for_media(
            MediaType.image.value, media_path))
        outcome.signals.extend(compression)

        await self._report("AI_GENERATED_ANALYSIS", 40, "Checking abstraction statistics")
        ai_generated = await AIGeneratedAbstractionAnalyzer().analyze(DetectorContext.for_media(
            MediaType.image.value, media_path))
        outcome.signals.extend(ai_generated)

        await self._report("FREQUENCY_ANALYSIS", 50, "Analyzing frequency-domain artifacts")
        analyzer = FFTSpatialFrequencyAnalyzer(spectrum_dir=str(work_dir / "spectra"))
        frequency = await analyzer.analyze(media_path)
        if frequency.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.frequency.value,
                score=frequency.score,
                confidence=degraded_confidence(quality, 0.7),
                severity=severity_for_score(frequency.score).value,
                explanation=frequency.explanation,
                model_version=frequency.model_version,
                details={"anomalies": frequency.anomalies},
                limitations=list(limitations),
            ))
            outcome.frequency_data = frequency.frequency_points
            if frequency.spectrum_uri:
                key = await self._store_artifact(analysis_id, "spectra", frequency.spectrum_uri)
                outcome.artifacts["frequency_spectrum"] = self.storage.url(key)

        await self._report("HEATMAP", 62, "Generating explainability heatmap")
        heatmap_path, regions = await asyncio.to_thread(generate_heatmap, media_path, str(work_dir / "heatmaps"))
        if regions:
            outcome.heatmap_regions = regions
        key = await self._store_artifact(analysis_id, "heatmaps", heatmap_path)
        outcome.artifacts["heatmap"] = self.storage.url(key)
        outcome.evidence.append({
            "signal_type": SignalType.spatial.value,
            "kind": "heatmap",
            "label": "Spatial activation heatmap",
            "score": spatial.score,
            "confidence": spatial.confidence,
            "severity": severity_for_score(spatial.score or 0.0).value,
            "explanation": "Region-level heatmap highlighting areas of high manipulation probability.",
            "artifact_uri": outcome.artifacts["heatmap"],
        })

        await self._report("METADATA_ANALYSIS", 78, "Inspecting metadata and provenance")
        metadata = await get_metadata_detector().analyze(media_path, MediaType.image.value)
        self._record_metadata(outcome, metadata, MediaType.image.value)

        await self._report("EVIDENCE_FUSION", 90, "Fusing independent signals")
        outcome.evidence.extend(self._metadata_evidence(metadata))

    # ------------------------------------------------------------- video
    async def _run_video(self, media_path: str, quality: MediaQuality | None, analysis_id: str,
                         outcome: PipelineOutcome, work_dir: Path) -> None:
        await self._report("VALIDATION", 3, "Validating video file")
        frames_dir = work_dir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        await self._report("MEDIA_EXTRACTION", 12, "Sampling frames from video")
        extractor = FrameExtractor()
        frames = await asyncio.to_thread(extractor.extract, media_path, str(frames_dir))
        if not frames:
            raise InvalidMediaError(message="No frames could be extracted from the video.")
        outcome.media_details["frame_count"] = len(frames)
        outcome.media_details["sample_fps"] = extractor.sample_fps

        # Per-frame spatial analysis (capped by frame extraction).
        frame_scores: list[dict[str, Any]] = []
        spatial_detector = get_spatial_detector()
        total = len(frames)
        for i, frame in enumerate(frames):
            pct = 15 + int(45 * i / max(total, 1))
            await self._report("SPATIAL_ANALYSIS", pct, f"Analyzing frame {frame.frame_number}")
            result = await spatial_detector.analyze(str(frame.path))
            if result.score is not None:
                frame_scores.append({
                    "frame_number": frame.frame_number,
                    "timestamp": round(frame.timestamp, 3),
                    "score": result.score,
                    "reason": result.explanation,
                })
        if frame_scores:
            mean_spatial = sum(fs["score"] for fs in frame_scores) / len(frame_scores)
            max_frame = max(frame_scores, key=lambda fs: fs["score"])
            outcome.signals.append(SignalResult(
                signal_type=SignalType.spatial.value,
                score=round(mean_spatial, 3), confidence=0.7,
                severity=severity_for_score(mean_spatial).value,
                explanation=f"Spatial analysis across {len(frame_scores)} sampled frames.",
                model_version=spatial_detector.model_version,
                details={"peak_frame": max_frame},
            ))

        await self._report("FREQUENCY_ANALYSIS", 58, "Analyzing frequency-domain artifacts")
        freq_analyzer = FFTSpatialFrequencyAnalyzer(spectrum_dir=str(work_dir / "spectra"))
        frequency = await freq_analyzer.analyze(str(frames[0].path))
        if frequency.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.frequency.value,
                score=frequency.score, confidence=0.7,
                severity=severity_for_score(frequency.score).value,
                explanation=frequency.explanation,
                model_version=frequency.model_version,
                details={"anomalies": frequency.anomalies},
            ))
            outcome.frequency_data = frequency.frequency_points
            if frequency.spectrum_uri:
                key = await self._store_artifact(analysis_id, "spectra", frequency.spectrum_uri)
                outcome.artifacts["frequency_spectrum"] = self.storage.url(key)

        await self._report("TEMPORAL_ANALYSIS", 66, "Analyzing temporal consistency")
        temporal_analyzer = TemporalAnalyzer(frame_scores=frame_scores)
        temporal: TemporalResult = await temporal_analyzer.analyze(str(frames_dir), fps=extractor.sample_fps)
        if temporal.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.temporal.value,
                score=temporal.score, confidence=0.75,
                severity=severity_for_score(temporal.score).value,
                explanation=temporal.explanation,
                model_version=temporal.model_version,
                details={"segments": temporal.anomalous_segments},
            ))
        outcome.suspicious_frames = temporal.suspicious_frames
        outcome.suspicious_segments = temporal.anomalous_segments
        for sf in temporal.suspicious_frames[:3]:
            outcome.evidence.append({
                "signal_type": SignalType.temporal.value,
                "kind": "frame",
                "label": f"Suspicious frame @ {sf['timestamp']}s",
                "score": sf["score"], "confidence": None,
                "severity": severity_for_score(sf["score"]).value,
                "explanation": sf["reason"],
                "timestamp_start": sf["timestamp"],
                "timestamp_end": None,
                "frame_number": sf["frame_number"],
            })

        await self._report("AUDIO_ANALYSIS", 74, "Analyzing audio track")
        await self._run_video_audio(media_path, analysis_id, outcome, work_dir)

        await self._report("METADATA_ANALYSIS", 80, "Inspecting metadata and provenance")
        metadata = await get_metadata_detector().analyze(media_path, MediaType.video.value)
        self._record_metadata(outcome, metadata, MediaType.video.value)
        outcome.evidence.extend(self._metadata_evidence(metadata))

        await self._report("AV_SYNC", 86, "Analyzing audio-visual synchronization")
        av_sync = await get_av_sync_detector().analyze(media_path, str(frames_dir))
        if av_sync.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.av_sync.value,
                score=av_sync.score, confidence=0.7,
                severity=severity_for_score(av_sync.score).value,
                explanation=av_sync.explanation,
                model_version=av_sync.model_version,
                details={"correlation": av_sync.correlation,
                         "segments": av_sync.suspicious_segments},
            ))
            outcome.suspicious_segments.extend(av_sync.suspicious_segments)

        if settings.enable_rppg:
            await self._report("RPPG", 88, "Analyzing physiological signals")
            rppg: RPPGResult = await get_rppg_detector().analyze(media_path)
            outcome.signals.append(SignalResult(
                signal_type=SignalType.physiological.value,
                score=rppg.score, confidence=0.6 if rppg.score is not None else None,
                severity=severity_for_score(rppg.score).value if rppg.score is not None else "low",
                status=rppg.status,
                explanation=rppg.explanation,
                model_version=rppg.model_version,
                details={"heart_rate": rppg.heart_rate, "signal_quality": rppg.signal_quality},
            ))

        await self._report("LIGHTING_ANALYSIS", 90, "Analyzing lighting consistency")
        lighting = await LightingConsistencyAnalyzer().analyze(
            DetectorContext.for_media(MediaType.video.value, media_path),
            frames=frames,
        )
        outcome.signals.extend(lighting)
        for signal in lighting:
            for ev in signal.evidence:
                outcome.evidence.append({
                    "signal_type": SignalType.lighting.value,
                    "kind": ev.get("kind", "lighting-segment"),
                    "label": ev.get("label", ""),
                    "score": signal.score,
                    "confidence": signal.confidence,
                    "severity": signal.severity,
                    "explanation": ev.get("detail", ""),
                    "timestamp_start": ev.get("timestamp_start"),
                    "timestamp_end": ev.get("timestamp_end"),
                    "frame_number": None,
                    "metadata": {},
                })

        await self._report("FACE_TRACKING", 92, "Tracking face identity consistency")
        face_motion = await FaceTrackingAnalyzer().analyze(
            DetectorContext.for_media(MediaType.video.value, media_path),
            frames=frames,
        )
        outcome.signals.extend(face_motion)
        for signal in face_motion:
            for ev in signal.evidence:
                outcome.evidence.append({
                    "signal_type": SignalType.face_tracking.value,
                    "kind": ev.get("kind", "track"),
                    "label": ev.get("label", ""),
                    "score": signal.score,
                    "confidence": signal.confidence,
                    "severity": signal.severity,
                    "explanation": ev.get("detail", ""),
                    "timestamp_start": ev.get("timestamp_start"),
                    "timestamp_end": ev.get("timestamp_end"),
                    "frame_number": None,
                    "metadata": {},
                })

        await self._report("EVIDENCE_FUSION", 95, "Fusing independent signals")

    async def _run_video_audio(self, media_path: str, analysis_id: str, outcome: PipelineOutcome,
                               work_dir: Path) -> AudioResult | None:
        from ..utils.ffmpeg import extract_audio

        audio_path = work_dir / "audio" / "track.wav"
        try:
            await asyncio.to_thread(extract_audio, media_path, str(audio_path))
        except Exception:
            return None
        detector = get_audio_detector()
        if hasattr(detector, "spectrogram_dir"):
            detector.spectrogram_dir = str(work_dir / "spectrograms")  # type: ignore[attr-defined]
        result = await detector.analyze(str(audio_path))
        if result.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.voice_spectral.value,
                score=result.score, confidence=0.75,
                severity=severity_for_score(result.score).value,
                explanation=result.explanation,
                model_version=result.model_version,
                details={
                    "spectral_score": result.spectral_score,
                    "prosody_score": result.prosody_score,
                    "pitch_score": result.pitch_score,
                    "vocoder_artifacts": result.vocoder_artifacts,
                    "breath_noise": result.breath_noise,
                    "segments": result.segments,
                },
            ))
            if result.spectrogram_uri:
                key = await self._store_artifact(analysis_id, "spectrograms", result.spectrogram_uri)
                outcome.artifacts["spectrogram"] = self.storage.url(key)
            outcome.audio_analysis = {
                "spectralConsistency": result.spectral_score,
                "prosody": result.prosody_score,
                "pitchNaturalness": result.pitch_score,
                "vocoderArtifacts": result.vocoder_artifacts,
                "breathNoise": result.breath_noise,
                "suspiciousSegments": result.segments,
            }
            for seg in result.segments:
                outcome.evidence.append({
                    "signal_type": SignalType.voice_spectral.value,
                    "kind": "audio-anomaly",
                    "label": "Audio anomaly segment",
                    "score": seg.get("score"), "confidence": None,
                    "severity": severity_for_score(seg.get("score", 0.0)).value,
                    "explanation": "Spectral anomaly detected in audio segment.",
                    "timestamp_start": seg.get("start"), "timestamp_end": seg.get("end"),
                })
        await self._run_speech_synthetic(outcome, str(audio_path))
        return result

    # ------------------------------------------------------------- audio
    async def _run_audio(self, media_path: str, quality: MediaQuality | None, analysis_id: str,
                         outcome: PipelineOutcome, work_dir: Path) -> None:
        await self._report("VALIDATION", 5, "Validating audio file")
        await self._report("AUDIO_ANALYSIS", 30, "Analyzing spectral characteristics")
        detector = get_audio_detector()
        if hasattr(detector, "spectrogram_dir"):
            detector.spectrogram_dir = str(work_dir / "spectrograms")  # type: ignore[attr-defined]
        result = await detector.analyze(media_path)
        if result.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.voice_spectral.value,
                score=result.score, confidence=0.75,
                severity=severity_for_score(result.score).value,
                explanation=result.explanation,
                model_version=result.model_version,
                details={
                    "spectral_score": result.spectral_score,
                    "prosody_score": result.prosody_score,
                    "pitch_score": result.pitch_score,
                    "vocoder_artifacts": result.vocoder_artifacts,
                    "breath_noise": result.breath_noise,
                    "segments": result.segments,
                },
            ))
            outcome.audio_analysis = {
                "spectralConsistency": result.spectral_score,
                "prosody": result.prosody_score,
                "pitchNaturalness": result.pitch_score,
                "vocoderArtifacts": result.vocoder_artifacts,
                "breathNoise": result.breath_noise,
                "suspiciousSegments": result.segments,
            }
            if result.spectrogram_uri:
                key = await self._store_artifact(analysis_id, "spectrograms", result.spectrogram_uri)
                outcome.artifacts["spectrogram"] = self.storage.url(key)

        await self._report("SPEECH_SYNTHETIC", 45, "Analyzing synthetic-speech abstractions")
        await self._run_speech_synthetic(outcome, media_path)

        await self._report("METADATA_ANALYSIS", 55, "Inspecting metadata and provenance")
        metadata = await get_metadata_detector().analyze(media_path, MediaType.audio.value)
        self._record_metadata(outcome, metadata, MediaType.audio.value)
        outcome.evidence.extend(self._metadata_evidence(metadata))

        await self._report("PROSODY", 75, "Analyzing prosody and pitch")
        await self._report("EVIDENCE_FUSION", 90, "Fusing independent signals")

    # ------------------------------------------------------------- helpers
    async def _run_speech_synthetic(self, outcome: PipelineOutcome, audio_path: str) -> None:
        from ..forensic.audio.synthetic_speech import SyntheticSpeechAbstractionAnalyzer

        try:
            signals = await SyntheticSpeechAbstractionAnalyzer().analyze(
                DetectorContext.for_media(MediaType.audio.value, audio_path)
            )
        except Exception:
            return
        for signal in signals:
            outcome.signals.append(signal)
            for ev in signal.evidence:
                outcome.evidence.append({
                    "signal_type": SignalType.speech_synthetic.value,
                    "kind": ev.get("kind", "spectral"),
                    "label": ev.get("label", ""),
                    "score": signal.score,
                    "confidence": signal.confidence,
                    "severity": signal.severity,
                    "explanation": ev.get("detail", ""),
                    "timestamp_start": ev.get("timestamp_start"),
                    "timestamp_end": ev.get("timestamp_end"),
                    "frame_number": None,
                    "metadata": {},
                })

    def _record_metadata(self, outcome: PipelineOutcome, metadata: MetadataResult,
                         media_type: str) -> None:
        outcome.metadata_record = {
            "raw": metadata.raw,
            "exif_status": metadata.exif_status,
            "double_compression": metadata.double_compression,
            "suspicious_software": metadata.suspicious_software,
            "c2pa_status": metadata.c2pa_status,
            "ela_score": metadata.ela_score,
            "findings": metadata.findings,
        }
        if metadata.score is not None:
            outcome.signals.append(SignalResult(
                signal_type=SignalType.metadata.value,
                score=metadata.score, confidence=0.65,
                severity=severity_for_score(metadata.score).value,
                explanation=metadata.explanation,
                model_version=metadata.model_version,
                details={"findings": metadata.findings},
            ))

    def _metadata_evidence(self, metadata: MetadataResult) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for f in metadata.findings:
            items.append({
                "signal_type": SignalType.metadata.value,
                "kind": "metadata-finding",
                "label": f["label"],
                "score": None, "confidence": None,
                "severity": f.get("severity", "low"),
                "explanation": f["detail"],
            })
        return items

    async def _fuse_and_calibrate(self, outcome: PipelineOutcome, media_type: str) -> None:
        await self._report("EVIDENCE_FUSION", 95, "Fusing independent signals")
        signals = outcome.signals
        consensus = build_consensus(signals, media_type)
        outcome.agreement_score = consensus.agreement_score
        outcome.cross_modal = consensus.to_dict()
        outcome.cross_modal["context_notes"] = context_notes(signals)

        scores = {s.signal_type: s.score for s in signals}
        classifier = get_meta_classifier()
        fused, uncertainty = classifier.predict_with_agreement(
            scores,
            media_type,
            agreement=consensus.agreement_score,
            n_signals=consensus.considered_signals,
        )
        outcome.fused_probability = fused
        outcome.uncertainty = uncertainty

        await self._report("CALIBRATION", 98, "Calibrating confidence")
        calibrator = get_calibrator()
        calibrated = calibrator.calibrate_with_interval(
            fused, uncertainty=uncertainty, n_signals=consensus.considered_signals
        )
        calib: dict[str, Any] = calibrated.to_dict()

        result = assess(calibrated.calibrated_probability, uncertainty=uncertainty)
        outcome.verdict = result.verdict.value
        outcome.explanation = result.description
        calib["verdict"] = result.verdict.value
        calib["uncertainty"] = round(uncertainty, 3)
        if result.thresholds_used:
            calib["thresholds_used"] = result.thresholds_used
        outcome.calibrated = calib

    async def _store_artifact(self, analysis_id: str, folder: str, local_path: str) -> str:
        from io import BytesIO

        src = Path(local_path)
        key = f"{folder}/{analysis_id}/{src.name}"
        await self.storage.save(key, BytesIO(src.read_bytes()))
        return key


async def _noop() -> None:
    return None

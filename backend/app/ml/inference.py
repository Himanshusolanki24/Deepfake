from __future__ import annotations

import hashlib
from typing import Any, Protocol

from ..forensic.signals import (
    AudioResult,
    AVSyncResult,
    FrequencyResult,
    MetadataResult,
    RPPGResult,
    SpatialResult,
    TemporalResult,
)


class SpatialDetector(Protocol):
    model_version: str
    async def analyze(self, image_path: str) -> SpatialResult: ...


class FrequencyDetector(Protocol):
    model_version: str
    async def analyze(self, image_path: str) -> FrequencyResult: ...


class MetadataDetector(Protocol):
    model_version: str
    async def analyze(self, media_path: str, media_type: str) -> MetadataResult: ...


class TemporalDetector(Protocol):
    model_version: str
    async def analyze(self, frames_dir: str, fps: float = 2.0) -> TemporalResult: ...


class AudioDetector(Protocol):
    model_version: str
    async def analyze(self, audio_path: str) -> AudioResult: ...


class RPPGDetector(Protocol):
    model_version: str
    async def analyze(self, video_path: str) -> RPPGResult: ...


class AVSyncDetector(Protocol):
    model_version: str
    async def analyze(self, video_path: str, frames_dir: str) -> AVSyncResult: ...


def _stable_seed(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return int(digest[:12], 16)


class MockSpatialDetector:
    """Deterministic mock producing realistic per-file outputs."""

    model_version = "spatial-v1"

    async def analyze(self, image_path: str) -> SpatialResult:
        seed = _stable_seed(image_path)
        base = (seed % 40) / 100  # 0.00 - 0.39 file-specific offset
        score = round(min(0.97, 0.45 + base + (seed // 1000 % 30) / 100), 2)
        confidence = round(min(0.95, 0.78 + (seed // 500 % 17) / 100), 2)
        regions: list[dict[str, Any]] = []
        n_regions = seed % 3
        for i in range(n_regions):
            regions.append(
                {
                    "x": 20 + (seed // (10 + i)) % 60,
                    "y": 20 + (seed // (30 + i)) % 60,
                    "width": 40 + (seed // 7) % 60,
                    "height": 40 + (seed // 13) % 60,
                    "intensity": round(0.5 + ((seed >> i) % 40) / 100, 2),
                    "label": "face_region" if i == 0 else "texture_artifact",
                }
            )
        return SpatialResult(
            score=score,
            confidence=confidence,
            model_version=self.model_version,
            regions=regions,
            explanation=(
                "Spatial texture analysis found blend artifacts consistent with "
                "synthetic face generation." if score > 0.6 else
                "No significant spatial blending artifacts detected."
            ),
        )


class MockFrequencyDetector:
    model_version = "frequency-v1"

    async def analyze(self, image_path: str) -> FrequencyResult:
        seed = _stable_seed(image_path)
        score = round(min(0.95, 0.35 + (seed % 60) / 100), 2)
        bands = ["low", "mid", "high"]
        anomalies = [
            {
                "frequency_band": band,
                "strength": round(0.3 + ((seed >> i) % 50) / 100, 2),
            }
            for i, band in enumerate(bands)
        ]
        freq_points = [
            {
                "frequency": f,
                "magnitude": round((seed % 900 + (seed >> 1) % 900) / 1000.0, 3),
                "baseline": round((seed % 400 + (seed >> 2) % 400) / 1000.0, 3),
                "anomalous": (seed >> 2) % 3 == 0,
            }
            for f in [8, 16, 32, 64, 128, 256, 512, 1024]
        ]
        return FrequencyResult(
            score=score,
            model_version=self.model_version,
            anomalies=anomalies,
            frequency_points=freq_points,
            explanation="Spectral analysis reveals periodic high-frequency grid artifacts "
            "typical of generative upsampling." if score > 0.6 else
            "Frequency spectrum appears broadly consistent with a natural capture.",
        )


class MockTemporalDetector:
    model_version = "temporal-v1"

    async def analyze(self, frames_dir: str, fps: float = 2.0) -> TemporalResult:
        seed = _stable_seed(frames_dir)
        score = round(min(0.95, 0.3 + (seed % 60) / 100), 2)
        n_segments = seed % 2
        segments = []
        for i in range(n_segments):
            start = round(2.0 + i * 6.0 + (seed % 40) / 10, 2)
            segments.append(
                {
                    "start": start,
                    "end": round(start + 2.4 + (seed >> 1) % 20 / 10, 2),
                    "score": round(min(0.97, 0.6 + (seed >> i) % 30 / 100), 2),
                }
            )
        frames = [
            {
                "frame_number": 10 + i * 6,
                "timestamp": round((10 + i * 6) / fps, 2),
                "score": round(min(0.98, 0.5 + (seed >> i) % 40 / 100), 2),
                "reason": "Landmark trajectory discontinuity",
            }
            for i in range(n_segments + 1)
        ]
        return TemporalResult(
            score=score,
            model_version=self.model_version,
            anomalous_segments=segments,
            suspicious_frames=frames,
            explanation="Temporal landmark analysis found discontinuous motion traces "
            "between facial regions." if score > 0.6 else
            "Motion trajectories were consistent across sampled frames.",
        )


class MockAudioDetector:
    model_version = "audio-v1"

    async def analyze(self, audio_path: str) -> AudioResult:
        seed = _stable_seed(audio_path)
        score = round(min(0.95, 0.35 + (seed % 60) / 100), 2)
        return AudioResult(
            score=score,
            model_version=self.model_version,
            spectral_score=round(min(0.95, 0.3 + (seed % 55) / 100), 2),
            prosody_score=round(min(0.95, 0.25 + (seed // 7 % 60) / 100), 2),
            pitch_score=round(min(0.95, 0.3 + (seed // 13 % 55) / 100), 2),
            vocoder_artifacts=round(min(0.95, 0.2 + (seed // 29 % 60) / 100), 2),
            breath_noise=round(min(0.95, 0.15 + (seed // 41 % 50) / 100), 2),
            segments=[],
            explanation="Spectral analysis detected vocoder artifacts in the voice band."
            if score > 0.6 else "Audio spectrum appears natural with expected formant structure.",
        )


class MockRPPGDetector:
    model_version = "rppg-v1"

    async def analyze(self, video_path: str) -> RPPGResult:
        seed = _stable_seed(video_path)
        quality = round(0.35 + (seed % 45) / 100, 2)
        if quality < 0.4:
            return RPPGResult(
                score=None,
                model_version=self.model_version,
                heart_rate=None,
                signal_quality=quality,
                status="insufficient_evidence",
                explanation="Facial ROI signal quality too low for reliable pulse analysis.",
            )
        return RPPGResult(
            score=round(0.3 + (seed // 17 % 45) / 100, 2),
            model_version=self.model_version,
            heart_rate=62 + (seed // 23) % 24,
            signal_quality=quality,
            status="available",
            explanation="Pulse proxy derived from facial color variation within normal range.",
        )


class MockAVSyncDetector:
    model_version = "av-sync-v1"

    async def analyze(self, video_path: str, frames_dir: str) -> AVSyncResult:
        seed = _stable_seed(video_path + frames_dir)
        correlation = round(-0.35 + (seed % 75) / 100, 2)
        score = round(min(0.95, max(0.1, 0.5 - correlation)), 2)
        segments: list[dict[str, Any]] = []
        if score > 0.7:
            segments.append(
                {"start": round(3.2 + (seed % 20) / 10, 2), "end": round(5.4 + (seed % 20) / 10, 2),
                 "score": round(score, 2)}
            )
        return AVSyncResult(
            score=score,
            model_version=self.model_version,
            correlation=correlation,
            suspicious_segments=segments,
            explanation="Lip motion and audio envelope show weak alignment."
            if score > 0.6 else "Lip-sync correlation is within expected range.",
        )


class MockMetadataDetector:
    model_version = "metadata-v1"

    async def analyze(self, media_path: str, media_type: str) -> MetadataResult:
        from ..forensic.image.metadata import run_metadata_analysis

        return await run_metadata_analysis(media_path, media_type)


def get_spatial_detector() -> SpatialDetector:
    from ..config import get_settings

    if get_settings().use_mock_models:
        return MockSpatialDetector()
    from ..forensic.image.spatial import TorchSpatialDetector

    return TorchSpatialDetector()


def get_frequency_detector() -> FrequencyDetector:
    from ..forensic.image.frequency import FFTSpatialFrequencyAnalyzer

    return FFTSpatialFrequencyAnalyzer()


def get_metadata_detector() -> MetadataDetector:
    from ..forensic.image.metadata import MetadataAnalyzer

    return MetadataAnalyzer()


def get_temporal_detector() -> TemporalDetector:
    from ..config import get_settings

    if get_settings().use_mock_models:
        return MockTemporalDetector()
    from ..forensic.video.temporal import TemporalAnalyzer

    return TemporalAnalyzer()


def get_audio_detector() -> AudioDetector:
    from ..config import get_settings

    if get_settings().use_mock_models:
        return MockAudioDetector()
    from ..forensic.audio.voice_detector import VoiceDetector

    return VoiceDetector()


def get_rppg_detector() -> RPPGDetector:
    from ..forensic.video.rppg import RPPGAnalyzer

    return RPPGAnalyzer()


def get_av_sync_detector() -> AVSyncDetector:
    from ..config import get_settings

    if get_settings().use_mock_models:
        return MockAVSyncDetector()
    from ..forensic.video.av_sync import AVSyncAnalyzer

    return AVSyncAnalyzer()

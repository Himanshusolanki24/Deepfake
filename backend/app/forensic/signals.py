from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SignalResult:
    """Canonical output of any forensic detector."""

    signal_type: str
    score: float | None
    confidence: float | None
    severity: str
    status: str = "available"
    explanation: str = ""
    model_version: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    evidence: list[dict[str, Any]] = field(default_factory=list)
    artifacts: dict[str, str | None] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "signal_type": self.signal_type,
            "score": self.score,
            "confidence": self.confidence,
            "severity": self.severity,
            "status": self.status,
            "explanation": self.explanation,
            "model_version": self.model_version,
            "details": self.details,
            "evidence": self.evidence,
            "artifacts": self.artifacts,
        }


@dataclass
class SpatialResult:
    score: float | None
    confidence: float | None
    model_version: str
    regions: list[dict[str, Any]] = field(default_factory=list)
    explanation: str = ""
    heatmap_uri: str | None = None


@dataclass
class FrequencyResult:
    score: float | None
    model_version: str
    anomalies: list[dict[str, Any]] = field(default_factory=list)
    spectrum_uri: str | None = None
    frequency_points: list[dict[str, Any]] = field(default_factory=list)
    explanation: str = ""


@dataclass
class MetadataResult:
    score: float | None
    model_version: str
    raw: dict[str, Any] = field(default_factory=dict)
    exif_status: str = "absent"
    double_compression: bool = False
    suspicious_software: bool = False
    c2pa_status: str = "not-present"
    ela_score: float | None = None
    findings: list[dict[str, Any]] = field(default_factory=list)
    explanation: str = ""


@dataclass
class TemporalResult:
    score: float | None
    model_version: str
    anomalous_segments: list[dict[str, Any]] = field(default_factory=list)
    suspicious_frames: list[dict[str, Any]] = field(default_factory=list)
    explanation: str = ""


@dataclass
class OpticalFlowResult:
    score: float | None
    model_version: str
    explanation: str = ""
    discontinuities: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class RPPGResult:
    score: float | None
    model_version: str
    heart_rate: int | None = None
    signal_quality: float | None = None
    status: str = "available"
    explanation: str = ""


@dataclass
class AVSyncResult:
    score: float | None
    model_version: str
    correlation: float | None = None
    suspicious_segments: list[dict[str, Any]] = field(default_factory=list)
    explanation: str = ""


@dataclass
class AudioResult:
    score: float | None
    model_version: str
    spectral_score: float | None = None
    prosody_score: float | None = None
    pitch_score: float | None = None
    vocoder_artifacts: float | None = None
    breath_noise: float | None = None
    segments: list[dict[str, Any]] = field(default_factory=list)
    spectrogram_uri: str | None = None
    explanation: str = ""

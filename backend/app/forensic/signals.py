from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SignalResult:
    """Canonical output of any forensic detector.

    A single detector emits one ``SignalResult`` per evidence family. The
    contract is deliberately minimal so every detector shares one shape
    regardless of provenance (CNN, signal processing or rule-based).
    """

    signal_type: str
    score: float | None
    confidence: float | None
    severity: str
    status: str = "available"
    explanation: str = ""
    model_version: str = ""
    detector_name: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    evidence: list[dict[str, Any]] = field(default_factory=list)
    artifacts: dict[str, str | None] = field(default_factory=dict)
    limitations: list[str] = field(default_factory=list)
    supporting_details: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.score is not None:
            self.score = float(min(1.0, max(0.0, self.score)))
        if self.confidence is not None:
            self.confidence = float(min(1.0, max(0.0, self.confidence)))

    def to_dict(self) -> dict[str, Any]:
        return {
            "signal_type": self.signal_type,
            "score": self.score,
            "confidence": self.confidence,
            "severity": self.severity,
            "status": self.status,
            "explanation": self.explanation,
            "model_version": self.model_version,
            "detector_name": self.detector_name,
            "details": self.details,
            "evidence": self.evidence,
            "artifacts": self.artifacts,
            "limitations": self.limitations,
            "supporting_details": self.supporting_details,
        }

    @property
    def is_available(self) -> bool:
        return self.status == "available" and self.score is not None


def merge_signal(signal: SignalResult, **updates: Any) -> SignalResult:
    """Return a copy of *signal* with mutable fields merged."""
    merged = SignalResult(
        signal_type=updates.get("signal_type", signal.signal_type),
        score=updates.get("score", signal.score),
        confidence=updates.get("confidence", signal.confidence),
        severity=updates.get("severity", signal.severity),
        status=updates.get("status", signal.status),
        explanation=updates.get("explanation", signal.explanation),
        model_version=updates.get("model_version", signal.model_version),
        detector_name=updates.get("detector_name", signal.detector_name),
        details={**signal.details, **updates.get("details", {})},
        evidence=list(signal.evidence),
        artifacts=dict(signal.artifacts),
        limitations=list(signal.limitations),
        supporting_details=list(signal.supporting_details),
    )
    if not updates.get("signal_type"):
        merged.signal_type = signal.signal_type
    return merged


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

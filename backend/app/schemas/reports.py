from __future__ import annotations

from pydantic import BaseModel, Field

MediaType = str
Verdict = str
Severity = str


class SignalEvidence(BaseModel):
    id: str
    kind: str
    label: str
    timestamp: str | None = None
    value: float | None = None


class SignalResultOut(BaseModel):
    id: str
    name: str
    score: float | None = None
    confidence: float | None = None
    severity: Severity
    explanation: str
    technical: list[str] = Field(default_factory=list)
    evidence: list[SignalEvidence] = Field(default_factory=list)


class SuspiciousFrameOut(BaseModel):
    frame: int
    timestamp: float
    score: float
    reason: str


class FrequencyPointOut(BaseModel):
    frequency: float
    magnitude: float
    baseline: float
    anomalous: bool


class HeatmapRegionOut(BaseModel):
    x: float
    y: float
    width: float
    height: float
    intensity: float
    label: str


class TimelineEventOut(BaseModel):
    time: str
    title: str
    severity: Severity | None = None
    detail: str | None = None


class MediaMetadataOut(BaseModel):
    filename: str
    mimeType: str
    fileSize: int
    dimensions: dict[str, int] | None = None
    codec: str | None = None
    duration: float | None = None
    creationTimestamp: str | None = None
    modificationTimestamp: str | None = None
    software: str | None = None
    exifStatus: str = "absent"
    c2pa: dict[str, str] = Field(default_factory=lambda: {"status": "not-present"})
    location: str | None = None
    deviceModel: str | None = None
    camera: str | None = None


class SuspiciousSegment(BaseModel):
    start: float
    end: float
    score: float


class AudioAnalysisOut(BaseModel):
    spectralConsistency: float
    prosody: float
    pitchNaturalness: float
    vocoderArtifacts: float
    breathNoise: float
    suspiciousSegments: list[SuspiciousSegment] = Field(default_factory=list)


class EvidenceOut(BaseModel):
    id: str
    signal_type: str
    kind: str
    label: str
    score: float | None = None
    confidence: float | None = None
    severity: Severity
    explanation: str
    timestamp_start: float | None = None
    timestamp_end: float | None = None
    frame_number: int | None = None
    artifact_uri: str | None = None
    metadata: dict = Field(default_factory=dict)


class AnalysisResponse(BaseModel):
    """Superset response: satisfies the Next.js frontend contract AND the
    AUTHENTIQ spec's machine-readable structure."""

    # --- Frontend contract (camelCase) ---
    id: str
    mediaType: MediaType
    filename: str
    previewUrl: str | None = None
    verdict: Verdict
    confidence: float
    confidenceInterval: dict[str, float] | None = None
    explanation: str
    signals: list[SignalResultOut] = Field(default_factory=list)
    suspiciousFrames: list[SuspiciousFrameOut] = Field(default_factory=list)
    frequencyData: list[FrequencyPointOut] = Field(default_factory=list)
    heatmapRegions: list[HeatmapRegionOut] = Field(default_factory=list)
    timeline: list[TimelineEventOut] = Field(default_factory=list)
    metadata: MediaMetadataOut | None = None
    audioAnalysis: AudioAnalysisOut | None = None
    processingTime: int | None = None
    status: str
    createdAt: str

    # --- Spec structure ---
    assessment: dict | None = None
    media: dict | None = None
    evidence: list[EvidenceOut] = Field(default_factory=list)
    suspicious_segments: list[SuspiciousSegment] = Field(default_factory=list)
    artifacts: dict[str, str | None] = Field(default_factory=dict)
    models: dict[str, str] = Field(default_factory=dict)
    processing: dict | None = None
    limitations: list[str] = Field(default_factory=list)


class AnalysisListResponse(BaseModel):
    items: list[AnalysisResponse]
    total: int

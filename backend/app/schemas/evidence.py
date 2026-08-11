from __future__ import annotations

from pydantic import BaseModel, Field


class EvidenceItem(BaseModel):
    id: str
    signal_type: str
    kind: str
    label: str
    score: float | None = None
    confidence: float | None = None
    severity: str
    explanation: str
    timestamp_start: float | None = None
    timestamp_end: float | None = None
    frame_number: int | None = None
    artifact_uri: str | None = None
    metadata: dict = Field(default_factory=dict)


class SuspiciousFrameItem(BaseModel):
    frame_number: int
    timestamp: float
    score: float
    reason: str


class SuspiciousSegment(BaseModel):
    start: float
    end: float
    score: float

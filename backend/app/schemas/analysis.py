from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class MediaInfo(BaseModel):
    type: Literal["image", "video", "audio"]
    filename: str
    original_filename: str | None = None
    mime_type: str | None = None
    sha256: str | None = None
    size_bytes: int | None = None
    duration: float | None = None
    width: int | None = None
    height: int | None = None
    codec: str | None = None


class Assessment(BaseModel):
    verdict: str
    probability: float
    raw_probability: float | None = None
    confidence_interval: dict[str, float] | None = None
    explanation: str


class SignalSummary(BaseModel):
    score: float | None = None
    confidence: float | None = None
    severity: str
    status: str = "available"
    explanation: str
    model_version: str | None = None


class SignalBreakdown(BaseModel):
    signals: dict[str, SignalSummary] = Field(default_factory=dict)


class Artifacts(BaseModel):
    heatmap: str | None = None
    frequency_spectrum: str | None = None
    spectrogram: str | None = None


class ModelsUsed(BaseModel):
    models: dict[str, str] = Field(default_factory=dict)


class ProcessingInfo(BaseModel):
    duration_ms: int | None = None
    completed_at: str | None = None


class Limitations(BaseModel):
    limitations: list[str] = Field(default_factory=list)

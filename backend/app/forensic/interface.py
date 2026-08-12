from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from ..db.enums import MediaType
from .signals import SignalResult


@dataclass
class MediaFacts:
    """Extracted media facts shared by every detector."""

    media_type: str
    path: str
    width: int | None = None
    height: int | None = None
    duration: float | None = None
    codec: str | None = None
    quality_score: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class DetectorContext:
    """Container handed to each detector before analysis.

    Carries the normalized media handle plus optional precomputed quality so
    detectors can degrade gracefully and report honest limitations.
    """

    media: MediaFacts
    sampling_rate: float | None = None
    frames_dir: str | None = None

    @classmethod
    def for_media(cls, media_type: str, path: str, **facts: Any) -> DetectorContext:
        return cls(media=MediaFacts(media_type=media_type, path=path, **facts))


@runtime_checkable
class Detector(Protocol):
    """Strict interface every forensic detector must satisfy."""

    name: str
    family: str
    model_version: str

    def supports(self, media_type: str) -> bool: ...

    def base_limitations(self) -> list[str]: ...

    async def analyze(self, ctx: DetectorContext, **kwargs: Any) -> list[SignalResult]: ...


class BaseDetector:
    """Reusable base for detectors that expose the ``Detector`` Protocol."""

    name: str = "base-detector"
    family: str = "base"
    model_version: str = "base-v1"

    def __init__(self) -> None:
        self._context: DetectorContext | None = None

    def supports(self, media_type: str) -> bool:
        return media_type == MediaType.image.value

    def base_limitations(self) -> list[str]:
        return []

    async def analyze(self, ctx: DetectorContext, **kwargs: Any) -> list[SignalResult]:
        raise NotImplementedError(f"{self.name}.analyze() is not implemented")

    def signal(
        self,
        signal_type: str,
        score: float | None,
        confidence: float | None,
        severity: str,
        *,
        explanation: str = "",
        status: str = "available",
        model_version: str | None = None,
        details: dict[str, Any] | None = None,
        evidence: list[dict[str, Any]] | None = None,
        artifacts: dict[str, str | None] | None = None,
        limitations: list[str] | None = None,
        supporting_details: list[str] | None = None,
    ) -> SignalResult:
        return SignalResult(
            signal_type=signal_type,
            score=score,
            confidence=confidence,
            severity=severity,
            status=status,
            explanation=explanation,
            model_version=model_version or self.model_version,
            detector_name=self.name,
            details=details or {},
            evidence=evidence or [],
            artifacts=artifacts or {},
            limitations=list(self.base_limitations()) + list(limitations or []),
            supporting_details=supporting_details or [],
        )


def available_signal(signal: SignalResult) -> bool:
    return signal.is_available
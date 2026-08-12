from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from ..db.enums import MediaType
from .signals import SignalResult


@dataclass
class CrossModalSummary:
    """Consensus statistics across independent forensic signals."""

    agreement_score: float
    directional_agreement: float
    inconsistencies: list[dict[str, Any]]
    considered_signals: int
    modality_coverage: dict[str, list[str]]
    signal_support: dict[str, float] = field(default_factory=dict)
    label: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "agreement_score": round(self.agreement_score, 3),
            "directional_agreement": round(self.directional_agreement, 3),
            "inconsistencies": self.inconsistencies,
            "considered_signals": self.considered_signals,
            "modality_coverage": self.modality_coverage,
            "signal_support": {k: round(v, 3) for k, v in self.signal_support.items()},
            "label": self.label,
        }


def available(signals: list[SignalResult]) -> list[SignalResult]:
    """Signals that produced a usable score (not insufficient/error)."""
    return [s for s in signals if s.score is not None and s.status == "available"]


def _direction(score: float | None) -> int:
    if score is None:
        return -1
    return 1 if score >= 0.5 else -1


def directional_agreement(signals: list[SignalResult]) -> float:
    """Fraction of available signal pairs that agree on manipulation direction."""
    avail = available(signals)
    if len(avail) < 2:
        return 1.0
    agree = 0
    total = 0
    for i in range(len(avail)):
        for j in range(i + 1, len(avail)):
            total += 1
            if _direction(avail[i].score) == _direction(avail[j].score):
                agree += 1
    return float(agree / max(total, 1))


def agreement_score(signals: list[SignalResult]) -> float:
    """Confidence-weighted agreement in [0, 1].

    Combines pairwise directional agreement with score-dispersion so that a
    tight cluster of agreeing signals scores high and scattered signals low."""
    avail = available(signals)
    da = directional_agreement(signals)
    if len(avail) < 2:
        return da
    scores = np.asarray([float(s.score or 0.0) for s in avail], dtype=float)
    spread = 1.0 - float(np.std(scores) / 0.35)
    spread = float(np.clip(spread, 0.0, 1.0))
    return float(0.7 * da + 0.3 * spread)


def detect_inconsistencies(signals: list[SignalResult]) -> list[dict[str, Any]]:
    """Pairs of signals pointing in opposite directions with meaningful weight."""
    avail = available(signals)
    found: list[dict[str, Any]] = []
    for i in range(len(avail)):
        a = avail[i]
        for j in range(i + 1, len(avail)):
            b = avail[j]
            if a.score is None or b.score is None:
                continue
            if _direction(a.score) == _direction(b.score):
                continue
            if abs(a.score - b.score) < 0.15:
                continue
            found.append({
                "signal_a": a.signal_type,
                "signal_b": b.signal_type,
                "score_a": round(float(a.score or 0.0), 3),
                "score_b": round(float(b.score or 0.0), 3),
                "note": (
                    "Independent signals disagree in direction; fused confidence is widened."
                ),
            })
    return found


def modality_coverage(signals: list[SignalResult], media_type: str) -> dict[str, list[str]]:
    by_media: dict[str, list[str]] = {}
    if media_type == MediaType.image.value:
        by_media["visual"] = ["spatial", "frequency", "compression", "ai-generated"]
        by_media["provenance"] = ["metadata"]
    elif media_type == MediaType.video.value:
        by_media["visual"] = ["spatial", "frequency", "lighting", "face-tracking"]
        by_media["temporal"] = ["temporal"]
        by_media["physiological"] = ["physiological"]
        by_media["audio-visual"] = ["av-sync"]
        by_media["audio"] = ["voice-spectral", "speech-synthetic"]
        by_media["provenance"] = ["metadata"]
    else:
        by_media["audio"] = ["voice-spectral", "speech-synthetic"]
        by_media["provenance"] = ["metadata"]
        by_media["spectral"] = ["frequency"]
    present = {s.signal_type for s in available(signals)}
    return {mod: [sig for sig in sigs if sig in present] for mod, sigs in by_media.items()}


def build_consensus(signals: list[SignalResult], media_type: str) -> CrossModalSummary:
    avail = available(signals)
    ag = agreement_score(signals)
    inc = detect_inconsistencies(signals)
    if inc:
        label = "disagreement-detected"
    elif ag >= 0.7:
        label = "consistent"
    elif ag >= 0.5:
        label = "weakly-consistent"
    else:
        label = "inconsistent"
    support = {}
    if avail:
        mean = float(np.mean([s.score for s in avail]))
        for s in avail:
            support[s.signal_type] = float(np.clip(score_support(s.score, mean, agreement=ag), 0.0, 1.0))
    return CrossModalSummary(
        agreement_score=ag,
        directional_agreement=directional_agreement(signals),
        inconsistencies=inc,
        considered_signals=len(avail),
        modality_coverage=modality_coverage(signals, media_type),
        signal_support=support,
        label=label,
    )


def score_support(score: float | None, consensus: float, agreement: float) -> float:
    """How strongly a signal supports the fused consensus direction."""
    if score is None:
        return 0.0
    if _direction(score) == _direction(consensus):
        return float(min(1.0, abs(0.5 - score) * 2.0 * (0.5 + 0.5 * agreement)))
    return float(min(1.0, abs(0.5 - score) * 2.0))


def localized_evidence(signals: list[SignalResult]) -> list[dict[str, Any]]:
    """Flatten signal-localized regions/frames/segments into evidence items."""
    items: list[dict[str, Any]] = []
    for s in signals:
        for region in s.details.get("regions", []):
            items.append({
                "signal_type": s.signal_type,
                "kind": "region",
                "label": "Localized region",
                "score": s.score,
                "confidence": s.confidence,
                "severity": s.severity,
                "x": region.get("x"),
                "y": region.get("y"),
                "width": region.get("width"),
                "height": region.get("height"),
                "intensity": region.get("intensity"),
            })
    return items


def context_notes(signals: list[SignalResult]) -> list[str]:
    """Human-oriented notes summarising cross-modal context."""
    avail = available(signals)
    if not avail:
        return ["No usable signals were produced; verdict relies on metadata only."]
    mods = {s.signal_type for s in avail}
    notes = []
    if len(mods) >= 3:
        notes.append("Multiple independent modalities were evaluated.")
    if len(mods) == 1:
        notes.append("Only a single signal family was available; treat the verdict with caution.")
    return notes
from __future__ import annotations

from itertools import pairwise
from typing import Any

import numpy as np

from ...db.enums import MediaType, Severity, SignalStatus, SignalType
from ...forensic.interface import BaseDetector, DetectorContext
from ...forensic.signals import SignalResult


class LightingConsistencyAnalyzer(BaseDetector):
    """Temporal lighting-consistency detector for video.

    Signal type: ``lighting``.

    Synthesised footage often exhibits either unnaturally static illumination
    (generator keeps scene lighting constant) or abrupt illumination jumps
    (face/person swapped across cuts with mismatched light). We measure:
      * per-frame luminance/contrast trajectory,
      * count and strength of abrupt illumination discontinuities,
      * frame-to-frame illumination spread across sampled frames.
    """

    name = "lighting-consistency"
    family = "video-lighting"
    model_version = "lighting-v1"

    def supports(self, media_type: str) -> bool:
        return media_type == MediaType.video.value

    def base_limitations(self) -> list[str]:
        return [
            "Studio lighting or slow camera exposure can be legitimate sources of uniform light.",
            "Consistency analysis requires >= 4 sampled frames.",
        ]

    async def analyze(self, ctx: DetectorContext, **kwargs: Any) -> list[SignalResult]:
        frames = kwargs.get("frames") or []
        if len(frames) < 4:
            return [self.signal(
                signal_type=SignalType.lighting.value,
                score=None,
                confidence=None,
                severity=Severity.low.value,
                status=SignalStatus.insufficient_evidence.value,
                explanation="Insufficient frames to establish a lighting baseline.",
            )]

        obs: list[dict[str, float]] = []
        import cv2

        for frame in frames[:30]:
            image = cv2.imread(str(frame.path))
            if image is None:
                continue
            img = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
            obs.append({
                "ts": float(frame.timestamp),
                "mean": float(np.mean(img)),
                "contrast": float(np.std(img)),
                "entropy": _entropy(img),
            })
        if len(obs) < 4:
            return [self.signal(
                signal_type=SignalType.lighting.value,
                score=None,
                confidence=None,
                severity=Severity.low.value,
                status=SignalStatus.insufficient_evidence.value,
                explanation="Could not decode enough frames for lighting analysis.",
            )]

        luminances = np.asarray([o["mean"] for o in obs])
        deltas = np.abs(np.diff(luminances))
        jump_threshold = max(12.0, 0.15 * float(np.mean(luminances)) + 6.0)
        jumps = deltas > jump_threshold
        jump_strength = float(deltas[jumps].max()) if jumps.any() else 0.0
        jump_count = int(jumps.sum())
        trajectory_volatility = float(np.std(deltas) / (np.mean(deltas) + 1e-6))

        score = min(1.0, jump_count * 0.28 + jump_strength / 90.0 + trajectory_volatility * 0.18)
        score = round(float(score), 3)
        confidence = round(float(min(0.85, 0.4 + (len(obs) / 15.0) * 0.3)), 3)
        severity = Severity.high if score >= 0.7 else Severity.medium if score >= 0.4 else Severity.low

        details: dict[str, Any] = {
            "jump_count": jump_count,
            "jump_strength": round(jump_strength, 3),
            "trajectory_volatility": round(trajectory_volatility, 3),
            "samples": len(obs),
        }
        evidence: list[dict[str, Any]] = []
        for i, (ts_a, ts_b) in enumerate(pairwise([o["ts"] for o in obs])):
            if jumps[i]:
                evidence.append({
                    "kind": "lighting-segment",
                    "label": "Abrupt illumination change",
                    "timestamp_start": ts_a,
                    "timestamp_end": ts_b,
                    "value": round(float(deltas[i]), 2),
                    "detail": "Large luminance discontinuity without matching scene transition.",
                })

        explanation = (
            "Abrupt illumination discontinuities detected across sampled frames."
            if score >= 0.4 else
            "Illumination trajectory is smooth and consistent."
        )
        return [self.signal(
            signal_type=SignalType.lighting.value,
            score=score,
            confidence=confidence,
            severity=severity.value,
            explanation=explanation,
            status=SignalStatus.available.value,
            details=details,
            evidence=evidence[:8],
            supporting_details=[f"jumps={jump_count}", f"samples={len(obs)}"],
        )]


def _entropy(image: np.ndarray, bins: int = 32) -> float:
    hist, _ = np.histogram(image, bins=bins, range=(0, 255), density=True)
    hist = hist[hist > 0]
    if hist.size == 0:
        return 0.0
    return float(-np.sum(hist * np.log2(hist)))
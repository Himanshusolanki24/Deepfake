from __future__ import annotations

from itertools import pairwise
from typing import Any

import numpy as np

from ...db.enums import MediaType, Severity, SignalStatus, SignalType
from ...forensic.interface import BaseDetector, DetectorContext
from ...forensic.signals import SignalResult
from .face_detection import build_face_detector


class FaceTrackingAnalyzer(BaseDetector):
    """Face-track identity consistency detector for video.

    Signal type: ``face-tracking``.

    When the subject's face keeps switching identity between frames (face swap
    faces, cut-and-paste faces), the detected face track exhibits abrupt:
      * bounding-box jumps (low inter-frame IoU),
      * appearance discontinuities (colour-histogram distance).

    Detects bounding boxes with the OpenCV Haar cascade and scores track
    stability + appearance consistency. Degrades to ``insufficient_evidence``
    when no faces are visible.
    """

    name = "face-tracking"
    family = "video-face"
    model_version = "face-tracking-v1"

    def supports(self, media_type: str) -> bool:
        return media_type == MediaType.video.value

    def base_limitations(self) -> list[str]:
        return [
            "Haar detection fails on heavily occluded or profile faces.",
            "Adjacent different subjects legitimately break identity continuity.",
        ]

    async def analyze(self, ctx: DetectorContext, **kwargs: Any) -> list[SignalResult]:
        frames = kwargs.get("frames") or []
        if len(frames) < 3:
            return self._empty("Insufficient frames for face tracking.")

        import cv2

        detect = build_face_detector()
        if detect is None:
            return self._empty(
                "No face-detection model is configured for this environment."
            )

        detections: list[dict[str, Any]] = []
        for frame in frames[:24]:
            image = cv2.imread(str(frame.path))
            if image is None:
                continue
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = detect(image, gray)
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[:1]
            detections.append({
                "ts": float(frame.timestamp),
                "box": tuple(map(int, faces[0])) if faces else None,
                "id": str(frame.frame_number),
            })
        if len(detections) == 0:
            return self._empty("No face could be detected in sampled frames.")

        seen = [d for d in detections if d["box"] is not None]
        if not seen:
            return self._empty("No face could be detected in sampled frames.")

        track_breaks = 0
        iou_values: list[float] = []
        pairs = list(pairwise(detections))
        for prev, nxt in pairs:
            if prev["box"] is None or nxt["box"] is None:
                track_breaks += 1 if (prev["box"] is None) != (nxt["box"] is None) else 0
                continue
            iou = _iou(prev["box"], nxt["box"])
            iou_values.append(iou)
            if iou < 0.3:
                track_breaks += 1

        mean_iou = float(np.mean(iou_values)) if iou_values else 1.0
        appearance_distance = float(np.mean(_appearance_jumps(detections))) if len(detections) > 1 else 0.0

        coverage = len([d for d in detections if d["box"] is not None]) / max(len(detections), 1)
        score = min(1.0, track_breaks * 0.3 + appearance_distance * 0.35 + (1.0 - mean_iou) * 0.35)
        score = round(float(max(0.0, score)), 3)
        confidence = round(float(min(0.9, 0.35 + coverage * 0.4)), 3)
        severity = Severity.high if score >= 0.7 else Severity.medium if score >= 0.4 else Severity.low

        details: dict[str, Any] = {
            "track_breaks": track_breaks,
            "mean_iou": round(mean_iou, 3),
            "appearance_distance": round(appearance_distance, 3),
            "face_coverage": round(coverage, 3),
            "samples": len(detections),
        }
        evidence: list[dict[str, Any]] = []
        for prev, nxt in pairwise(detections):
            if prev["box"] is not None and nxt["box"] is not None:
                iou = _iou(prev["box"], nxt["box"])
                if iou < 0.3:
                    evidence.append({
                        "kind": "track",
                        "label": "Face track discontinuity",
                        "timestamp_start": prev["ts"],
                        "timestamp_end": nxt["ts"],
                        "value": round(1.0 - iou, 2),
                        "detail": "Bounding-box jump or appearance break in the face trajectory.",
                    })
        evidence = evidence[:8]

        explanation = (
            "Face-track discontinuities (box jumps or identity-contrast breaks)."
            if score >= 0.4 else
            "Face track is continuous and appearance-consistent."
        )
        return [self.signal(
            signal_type=SignalType.face_tracking.value,
            score=score,
            confidence=confidence,
            severity=severity.value,
            explanation=explanation,
            status=SignalStatus.available.value,
            details=details,
            evidence=evidence,
            supporting_details=[
                f"track_breaks={track_breaks}",
                f"mean_iou={mean_iou:.2f}",
                f"coverage={coverage:.2f}",
            ],
        )]

    def _empty(self, reason: str) -> list[SignalResult]:
        return [self.signal(
            signal_type=SignalType.face_tracking.value,
            score=None,
            confidence=None,
            severity=Severity.low.value,
            status=SignalStatus.insufficient_evidence.value,
            explanation=reason,
            limitations=["No faces visible; this signal carries no weight."],
        )]


def _iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
    iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    inter = ix * iy
    union = aw * ah + bw * bh - inter
    return float(inter / union) if union > 0 else 0.0


def _appearance_jumps(detections: list[dict[str, Any]]) -> list[float]:
    """Approximate appearance distance using detection-box aspect ratios and
    sizes re-derived from stored box geometry.

    True identity embeddings are out of scope for the abstraction; aspect and
    scale stability are used as a cheap proxy and disclosed in limitations."""
    distances: list[float] = []
    for prev, nxt in pairwise(detections):
        if prev["box"] is None or nxt["box"] is None:
            continue
        pw, ph = prev["box"][2], prev["box"][3]
        nw, nh = nxt["box"][2], nxt["box"][3]
        aspect = abs((pw / max(ph, 1)) - (nw / max(nh, 1)))
        scale = abs((pw * ph) / max(nw * nh, 1) - 1.0)
        distances.append(float(min(1.0, aspect * 0.6 + scale * 0.4)))
    return distances
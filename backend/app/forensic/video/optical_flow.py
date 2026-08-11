from __future__ import annotations

import numpy as np

from ..signals import OpticalFlowResult


class OpticalFlowAnalyzer:
    """Dense optical flow between consecutive sampled frames."""

    model_version = "optical-flow-v1"

    def __init__(self) -> None:
        self._prev_gray: np.ndarray | None = None
        self._prev_t: float | None = None

    def reset(self) -> None:
        self._prev_gray = None
        self._prev_t = None

    def analyze_sequence(self, frames: list[dict]) -> OpticalFlowResult:
        """frames: list of {path, timestamp, frame_number}."""
        import cv2

        scores: list[float] = []
        discontinuities: list[dict] = []
        prev_gray = None

        for frame in frames:
            img = cv2.imread(str(frame["path"]), cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue
            img = cv2.resize(img, (256, 256))
            if prev_gray is not None:
                flow = cv2.calcOpticalFlowFarneback(
                    prev_gray, img, None, 0.5, 3, 15, 3, 5, 1.2, 0
                )
                mag = np.sqrt(flow[..., 0] ** 2 + flow[..., 1] ** 2)
                variance = float(mag.var())
                # Abrupt motion or very high variance suggests generation artifacts.
                score = float(min(0.95, variance / 80.0))
                scores.append(score)
                if score > 0.6:
                    discontinuities.append({
                        "frame_number": frame["frame_number"],
                        "timestamp": frame["timestamp"],
                        "score": round(score, 3),
                    })
            prev_gray = img

        if not scores:
            return OpticalFlowResult(
                score=None,
                model_version=self.model_version,
                explanation="Insufficient frames for optical flow analysis.",
            )
        flow_score = round(float(np.mean(scores)), 3)
        return OpticalFlowResult(
            score=flow_score,
            model_version=self.model_version,
            discontinuities=discontinuities,
            explanation=(
                "Optical flow analysis found motion discontinuities."
                if flow_score > 0.5 else
                "Optical flow was smooth and physically plausible."
            ),
        )

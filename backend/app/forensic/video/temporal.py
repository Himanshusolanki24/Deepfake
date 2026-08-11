from __future__ import annotations

from pathlib import Path

import numpy as np

from ...config import get_settings
from ..signals import TemporalResult
from .landmarks import LandmarkTracker
from .optical_flow import OpticalFlowAnalyzer

settings = get_settings()


class TemporalAnalyzer:
    """Combines per-frame spatial scores, landmark trajectories and optical
    flow into a temporal-consistency signal."""

    model_version = "temporal-v1"

    def __init__(self, frame_scores: list[dict] | None = None) -> None:
        self.frame_scores = frame_scores or []
        self.tracker = LandmarkTracker()
        self.flow = OpticalFlowAnalyzer()

    def set_frame_scores(self, frame_scores: list[dict]) -> None:
        self.frame_scores = frame_scores

    async def analyze(self, frames_dir: str, fps: float = 2.0) -> TemporalResult:
        import cv2

        frames_dir = Path(frames_dir)
        paths = sorted(frames_dir.glob("frame_*.jpg"))

        landmarks_by_frame: list[tuple[float, np.ndarray | None]] = []
        for p in paths:
            img = cv2.imread(str(p))
            if img is None:
                landmarks_by_frame.append((0.0, None))
                continue
            lms = self.tracker.detect(img)
            arr = np.asarray(lms, dtype=np.float64) if lms else None
            landmarks_by_frame.append((0.0, arr))

        motion_scores: list[float] = []
        prev: np.ndarray | None = None
        for _, arr in landmarks_by_frame:
            if arr is not None and prev is not None:
                if arr.shape == prev.shape:
                    displacement = np.linalg.norm(arr - prev, axis=1).mean()
                    motion_scores.append(float(min(1.0, displacement * 4.0)))
            if arr is not None:
                prev = arr

        frame_irregularity: list[float] = []
        scores = [fs.get("score", 0.5) for fs in self.frame_scores if fs.get("score") is not None]
        for i in range(1, len(scores)):
            delta = abs(scores[i] - scores[i - 1])
            frame_irregularity.append(float(min(1.0, delta * 3.0)))

        flow_result = self.flow.analyze_sequence(
            [{"path": str(p), "frame_number": i + 1,
              "timestamp": round(i / fps, 2)} for i, p in enumerate(paths)]
        )

        motion = float(np.mean(motion_scores)) if motion_scores else 0.0
        irregularity = float(np.mean(frame_irregularity)) if frame_irregularity else 0.0
        flow_score = flow_result.score or 0.0

        # Jitter between successive landmark sets signals unstable geometry.
        jitter = 0.0
        if len(motion_scores) > 1:
            jitter = float(min(1.0, np.std(motion_scores) * 3.0))

        score = round(float(min(0.95, 0.45 * flow_score + 0.3 * irregularity + 0.15 * motion + 0.1 * jitter)), 3)

        segments: list[dict] = []
        suspicious_frames: list[dict] = []
        for i, fs in enumerate(self.frame_scores):
            if fs.get("score") and fs["score"] > 0.7:
                suspicious_frames.append({
                    "frame_number": fs.get("frame_number", i + 1),
                    "timestamp": fs.get("timestamp", round(i / fps, 2)),
                    "score": fs["score"],
                    "reason": fs.get("reason", "Elevated spatial artifact score"),
                })
        for d in flow_result.discontinuities:
            suspicious_frames.append({
                "frame_number": d["frame_number"],
                "timestamp": d["timestamp"],
                "score": d["score"],
                "reason": "Optical flow discontinuity",
            })

        suspicious_frames = sorted(suspicious_frames, key=lambda f: f["frame_number"])[:20]
        if suspicious_frames:
            ts = [f["timestamp"] for f in suspicious_frames]
            ts = sorted(ts)
            current = {"start": ts[0], "end": ts[0], "score": 0.0}
            for t in ts:
                if t - current["end"] <= 1.5:
                    current["end"] = t
                    current["score"] = max(current["score"], 0.0)
                else:
                    if current["score"]:
                        pass
                    current = {"start": t, "end": t, "score": 0.0}
            if current["start"] != current["end"]:
                segments.append({
                    "start": round(current["start"], 2),
                    "end": round(current["end"], 2),
                    "score": round(score, 2),
                })

        return TemporalResult(
            score=score,
            model_version=self.model_version,
            anomalous_segments=segments,
            suspicious_frames=suspicious_frames,
            explanation=(
                "Temporal consistency analysis found jittery motion and frame-level "
                "artifact fluctuation." if score > 0.5 else
                "Motion and frame consistency appear stable across the sample."
            ),
        )

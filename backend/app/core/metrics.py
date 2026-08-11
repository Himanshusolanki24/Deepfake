from __future__ import annotations

import threading
from collections import deque
from typing import Any


class Metrics:
    """Lightweight in-process metrics. Swappable for Prometheus later."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.total_analyses = 0
        self.successful_analyses = 0
        self.failed_analyses = 0
        self.processing_times: deque[float] = deque(maxlen=200)
        self.model_inference_latency: deque[float] = deque(maxlen=200)
        self.storage_bytes = 0

    def record_analysis(self, success: bool, duration_s: float) -> None:
        with self._lock:
            self.total_analyses += 1
            if success:
                self.successful_analyses += 1
            else:
                self.failed_analyses += 1
            self.processing_times.append(duration_s)

    def record_inference(self, duration_s: float) -> None:
        with self._lock:
            self.model_inference_latency.append(duration_s)

    def set_storage_bytes(self, size: int) -> None:
        with self._lock:
            self.storage_bytes = size

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            times = list(self.processing_times)
            lat = list(self.model_inference_latency)
        return {
            "total_analyses": self.total_analyses,
            "successful_analyses": self.successful_analyses,
            "failed_analyses": self.failed_analyses,
            "avg_processing_time_ms": round(sum(times) / len(times) * 1000, 2) if times else 0.0,
            "p95_processing_time_ms": _p95(times) if times else 0.0,
            "model_inference_avg_ms": round(sum(lat) / len(lat) * 1000, 2) if lat else 0.0,
            "queue_depth": 0,
            "storage_bytes": self.storage_bytes,
        }


def _p95(values: list[float]) -> float:
    ordered = sorted(values)
    idx = int(len(ordered) * 0.95)
    return round(ordered[min(idx, len(ordered) - 1)] * 1000, 2)


metrics = Metrics()

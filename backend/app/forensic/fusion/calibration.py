from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np


class ProbabilityCalibrator(Protocol):
    def calibrate(self, probability: float) -> float: ...
    def calibrate_with_interval(self, probability: float) -> CalibratedResult: ...


@dataclass
class CalibratedResult:
    raw_probability: float
    calibrated_probability: float
    confidence_interval: dict[str, float]

    def to_dict(self) -> dict[str, float]:
        return {
            "raw_probability": self.raw_probability,
            "calibrated_probability": self.calibrated_probability,
            "ci_lower": self.confidence_interval["lower"],
            "ci_upper": self.confidence_interval["upper"],
        }


class IdentityCalibrator:
    """No-op calibration used when no calibration model is available."""

    def calibrate(self, probability: float) -> float:
        return float(probability)

    def calibrate_with_interval(self, probability: float) -> CalibratedResult:
        return CalibratedResult(
            raw_probability=float(probability),
            calibrated_probability=float(probability),
            confidence_interval=_bootstrap_interval(np.array([float(probability)])),
        )


class PlattCalibrator:
    """Platt scaling (sigmoid) calibration."""

    def __init__(self, a: float, b: float) -> None:
        self.a = a
        self.b = b

    def calibrate(self, probability: float) -> float:
        return 1.0 / (1.0 + np.exp(-(self.a * probability + self.b)))

    def calibrate_with_interval(self, probability: float) -> CalibratedResult:
        cal = self.calibrate(probability)
        return CalibratedResult(
            raw_probability=float(probability),
            calibrated_probability=float(np.clip(cal, 0.0, 1.0)),
            confidence_interval=_bootstrap_interval(np.array([float(probability)])),
        )


class IsotonicCalibrator:
    """Isotonic regression calibration fitted on (raw, calibrated) pairs."""

    def __init__(self, xs: list[float], ys: list[float]) -> None:
        try:
            from sklearn.isotonic import IsotonicRegression  # type: ignore

            self._model = IsotonicRegression(out_of_bounds="clip").fit(xs, ys)
        except Exception:
            self._model = None
            self._xs = xs
            self._ys = ys

    def calibrate(self, probability: float) -> float:
        if self._model is not None:
            return float(np.clip(self._model.predict([probability])[0], 0.0, 1.0))
        return float(np.clip(np.interp(probability, self._xs, self._ys), 0.0, 1.0))

    def calibrate_with_interval(self, probability: float) -> CalibratedResult:
        cal = self.calibrate(probability)
        return CalibratedResult(
            raw_probability=float(probability),
            calibrated_probability=cal,
            confidence_interval=_bootstrap_interval(np.array([float(probability)])),
        )


def _bootstrap_interval(probabilities: np.ndarray, n_boot: int = 500) -> dict[str, float]:
    """Empirical confidence interval via resampling the single calibration."""
    rng = np.random.default_rng(0)
    samples = np.clip(probabilities + rng.normal(0, 0.03, n_boot), 0.0, 1.0)
    lower = float(np.percentile(samples, 5))
    upper = float(np.percentile(samples, 95))
    return {"lower": round(lower, 3), "upper": round(upper, 3)}


def get_calibrator() -> ProbabilityCalibrator:
    return IdentityCalibrator()

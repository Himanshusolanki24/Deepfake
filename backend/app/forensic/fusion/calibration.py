from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np


class ProbabilityCalibrator(Protocol):
    def calibrate(self, probability: float) -> float: ...
    def calibrate_with_interval(
        self,
        probability: float,
        *,
        uncertainty: float = 0.0,
        n_signals: int = 1,
    ) -> CalibratedResult: ...


@dataclass
class CalibratedResult:
    raw_probability: float
    calibrated_probability: float
    confidence_interval: dict[str, float]
    coverage: float = 0.9
    method: str = "identity"
    n_signals: int = 1
    uncertainty: float = 0.0

    def to_dict(self) -> dict[str, float]:
        return {
            "raw_probability": self.raw_probability,
            "calibrated_probability": self.calibrated_probability,
            "ci_lower": self.confidence_interval["lower"],
            "ci_upper": self.confidence_interval["upper"],
        }


def _widen(probability: float, uncertainty: float, n_signals: int, base: float = 0.03) -> float:
    """Half-width inflation from agreement quality and signal count."""
    signal_term = 1.0 + 1.0 / max(n_signals, 1)
    agreement_term = 1.0 + float(uncertainty) * 2.0
    return float(base * signal_term * agreement_term)


class IdentityCalibrator:
    """No-op calibration used when no calibration model is available."""

    method = "identity"

    def calibrate(self, probability: float) -> float:
        return float(probability)

    def calibrate_with_interval(
        self,
        probability: float,
        *,
        uncertainty: float = 0.0,
        n_signals: int = 1,
    ) -> CalibratedResult:
        return _interval_result(
            probability, probability, uncertainty, n_signals, self.method
        )



class PlattCalibrator:
    """Platt scaling (sigmoid) calibration."""

    method = "platt"

    def __init__(self, a: float, b: float) -> None:
        self.a = a
        self.b = b

    def calibrate(self, probability: float) -> float:
        return 1.0 / (1.0 + np.exp(-(self.a * probability + self.b)))

    def calibrate_with_interval(
        self,
        probability: float,
        *,
        uncertainty: float = 0.0,
        n_signals: int = 1,
    ) -> CalibratedResult:
        cal = self.calibrate(probability)
        return _interval_result(
            probability, float(np.clip(cal, 0.0, 1.0)), uncertainty, n_signals, self.method
        )



class IsotonicCalibrator:
    """Isotonic regression calibration fitted on (raw, calibrated) pairs."""

    method = "isotonic"

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

    def calibrate_with_interval(
        self,
        probability: float,
        *,
        uncertainty: float = 0.0,
        n_signals: int = 1,
    ) -> CalibratedResult:
        cal = self.calibrate(probability)
        return _interval_result(
            probability, cal, uncertainty, n_signals, self.method
        )



def _interval_result(
    raw: float,
    calibrated: float,
    uncertainty: float,
    n_signals: int,
    method: str,
) -> CalibratedResult:
    half = _widen(raw, uncertainty, n_signals)
    lower = float(np.clip(calibrated - half, 0.0, 1.0))
    upper = float(np.clip(calibrated + half, 0.0, 1.0))
    return CalibratedResult(
        raw_probability=float(raw),
        calibrated_probability=round(float(calibrated), 4),
        confidence_interval={"lower": round(lower, 3), "upper": round(upper, 3)},
        method=method,
        n_signals=n_signals,
        uncertainty=round(float(uncertainty), 3),
    )


def get_calibrator() -> ProbabilityCalibrator:
    return IdentityCalibrator()

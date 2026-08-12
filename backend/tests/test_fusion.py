from __future__ import annotations

import pytest

from app.db.enums import Verdict
from app.forensic.fusion.calibration import IdentityCalibrator, PlattCalibrator
from app.forensic.verdict_engine import VerdictConfig, assess, severity_for_score


def test_identity_calibrator_interval_widens_with_uncertainty():
    cal = IdentityCalibrator()
    narrow = cal.calibrate_with_interval(0.5, uncertainty=0.0, n_signals=5)
    wide = cal.calibrate_with_interval(0.5, uncertainty=0.5, n_signals=1)
    narrow_w = narrow.confidence_interval["upper"] - narrow.confidence_interval["lower"]
    wide_w = wide.confidence_interval["upper"] - wide.confidence_interval["lower"]
    assert wide_w > narrow_w


def test_interval_respects_unit_bounds():
    cal = IdentityCalibrator()
    r = cal.calibrate_with_interval(0.05, uncertainty=0.9, n_signals=1)
    assert r.confidence_interval["lower"] >= 0.0
    assert r.confidence_interval["upper"] <= 1.0


def test_platt_calibrator_monotonic():
    cal = PlattCalibrator(a=3.0, b=-1.5)
    low = cal.calibrate(0.2)
    high = cal.calibrate(0.9)
    assert high > low
    assert 0.0 <= low <= 1.0


def test_verdict_authentic():
    result = assess(0.1)
    assert result.verdict is Verdict.authentic
    assert result.severity.value == "low"
    assert result.label == "Authentic"


def test_verdict_inconclusive():
    result = assess(0.45)
    assert result.verdict is Verdict.inconclusive


def test_verdict_manipulated():
    result = assess(0.95)
    assert result.verdict is Verdict.manipulated
    assert result.severity.value == "high"


def test_verdict_uncertainty_widens_thresholds():
    tight = assess(0.31, config=VerdictConfig(authentic_max=0.30, inconclusive_max=0.60, suspicious_max=0.80))
    widened = assess(0.31, uncertainty=0.2, config=VerdictConfig(authentic_max=0.30, inconclusive_max=0.60, suspicious_max=0.80))
    assert tight.verdict in (Verdict.authentic, Verdict.inconclusive)
    assert widened.thresholds_used["authentic_max"] > 0.30


@pytest.mark.parametrize(
    ("score", "expected"),
    [(0.1, "low"), (0.4, "medium"), (0.7, "high"), (0.99, "high")],
)
def test_severity_for_score(score, expected):
    assert severity_for_score(score).value == expected
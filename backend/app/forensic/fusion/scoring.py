from __future__ import annotations

from dataclasses import dataclass

from ...config import get_settings
from ...db.enums import Severity, Verdict

settings = get_settings()


@dataclass
class VerdictResult:
    verdict: Verdict
    calibrated_probability: float
    severity: Severity
    label: str
    headline: str
    description: str


VERDICT_DESCRIPTIONS: dict[Verdict, str] = {
    Verdict.authentic: (
        "Multiple independent forensic signals found no consistent indication of "
        "synthetic generation or content manipulation."
    ),
    Verdict.suspicious: (
        "A subset of forensic signals deviate from expected baselines. "
        "Human review is recommended before downstream use."
    ),
    Verdict.manipulated: (
        "Multiple independent forensic signals indicate likely synthetic or "
        "manipulated content."
    ),
    Verdict.inconclusive: (
        "Available signals were insufficient to reach a confident assessment. "
        "Additional source media is recommended."
    ),
}


def assess(calibrated_probability: float) -> VerdictResult:
    """Map a calibrated manipulation probability to a verdict.

    Thresholds are configurable via environment variables.
    """
    p = float(calibrated_probability)
    if p <= settings.verdict_authentic_max:
        verdict = Verdict.authentic
        severity = Severity.low
        headline = "LOW PROBABILITY OF MANIPULATION"
    elif p <= settings.verdict_inconclusive_max:
        verdict = Verdict.inconclusive
        severity = Severity.medium
        headline = "INSUFFICIENT EVIDENCE"
    elif p <= settings.verdict_suspicious_max:
        verdict = Verdict.suspicious
        severity = Severity.medium
        headline = "REQUIRES HUMAN REVIEW"
    else:
        verdict = Verdict.manipulated
        severity = Severity.high
        headline = "HIGH PROBABILITY OF MANIPULATION"
    return VerdictResult(
        verdict=verdict,
        calibrated_probability=round(p, 4),
        severity=severity,
        label=verdict.value.title(),
        headline=headline,
        description=VERDICT_DESCRIPTIONS[verdict],
    )


def severity_for_score(score: float) -> Severity:
    if score >= 0.7:
        return Severity.high
    if score >= 0.4:
        return Severity.medium
    return Severity.low

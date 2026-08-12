from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..config import get_settings
from ..db.enums import Severity, Verdict

settings = get_settings()


@dataclass
class VerdictConfig:
    """Configurable verdict thresholds plus evidence-strength widening."""

    authentic_max: float
    inconclusive_max: float
    suspicious_max: float
    max_widening: float = 0.15

    @property
    def is_valid(self) -> bool:
        return self.authentic_max <= self.inconclusive_max <= self.suspicious_max

    def widen(self, uncertainty: float) -> VerdictConfig:
        """Return a copy whose inconclusive band is expanded by *uncertainty*.

        Low-evidence (high-uncertainty) assessments should be *less* likely to
        land in the confident authentic/manipulated bands and *more* likely to
        land in inconclusive/suspicious.
        """
        w = min(self.max_widening, self.max_widening * uncertainty)
        return VerdictConfig(
            authentic_max=min(self.inconclusive_max, self.authentic_max + w),
            inconclusive_max=min(self.suspicious_max, self.inconclusive_max + w / 2.0),
            suspicious_max=max(self.inconclusive_max, self.suspicious_max - w),
            max_widening=self.max_widening,
        )


def build_verdict_config() -> VerdictConfig:
    return VerdictConfig(
        authentic_max=float(settings.verdict_authentic_max),
        inconclusive_max=float(settings.verdict_inconclusive_max),
        suspicious_max=float(settings.verdict_suspicious_max),
    )


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


@dataclass
class VerdictResult:
    verdict: Verdict
    calibrated_probability: float
    severity: Severity
    label: str
    headline: str
    description: str
    thresholds_used: dict[str, float] = None  # type: ignore[assignment]
    rationale: list[str] = None  # type: ignore[assignment]


def assess(
    calibrated_probability: float,
    *,
    uncertainty: float = 0.0,
    config: VerdictConfig | None = None,
) -> VerdictResult:
    """Map a calibrated manipulation probability to a verdict.

    When *uncertainty* is non-zero (signal disagreement / insufficient
    evidence) the configured thresholds are widened so the system reports
    caution rather than false certainty.
    """
    cfg = (config or build_verdict_config()).widen(uncertainty)
    p = float(calibrated_probability)

    if p <= cfg.authentic_max:
        verdict = Verdict.authentic
        severity = Severity.low
        headline = "LOW PROBABILITY OF MANIPULATION"
    elif p <= cfg.inconclusive_max:
        verdict = Verdict.inconclusive
        severity = Severity.medium
        headline = "INSUFFICIENT EVIDENCE"
    elif p <= cfg.suspicious_max:
        verdict = Verdict.suspicious
        severity = Severity.medium
        headline = "REQUIRES HUMAN REVIEW"
    else:
        verdict = Verdict.manipulated
        severity = Severity.high
        headline = "HIGH PROBABILITY OF MANIPULATION"

    rationale: list[str] = []
    if uncertainty > 0.05:
        rationale.append("Signals disagreed; thresholds were widened to avoid overclaiming.")
    if p <= cfg.authentic_max:
        rationale.append("Calibrated probability sits below the authentic ceiling.")
    elif p > cfg.suspicious_max:
        rationale.append("Calibrated probability exceeds the manipulated floor.")

    return VerdictResult(
        verdict=verdict,
        calibrated_probability=round(p, 4),
        severity=severity,
        label=verdict.value.title(),
        headline=headline,
        description=VERDICT_DESCRIPTIONS[verdict],
        thresholds_used={
            "authentic_max": round(cfg.authentic_max, 3),
            "inconclusive_max": round(cfg.inconclusive_max, 3),
            "suspicious_max": round(cfg.suspicious_max, 3),
        },
        rationale=rationale,
    )


def severity_for_score(score: float) -> Severity:
    if score is None:
        return Severity.low
    if score >= 0.7:
        return Severity.high
    if score >= 0.4:
        return Severity.medium
    return Severity.low


def to_dict(result: VerdictResult) -> dict[str, Any]:
    return {
        "verdict": result.verdict.value,
        "calibrated_probability": result.calibrated_probability,
        "severity": result.severity.value,
        "label": result.label,
        "headline": result.headline,
        "description": result.description,
        "thresholds_used": result.thresholds_used,
        "rationale": result.rationale,
    }
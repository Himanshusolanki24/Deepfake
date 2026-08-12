from __future__ import annotations

from app.db.enums import MediaType
from app.forensic.evidence_engine import (
    CrossModalSummary,
    agreement_score,
    build_consensus,
    detect_inconsistencies,
    directional_agreement,
    modality_coverage,
)
from app.forensic.signals import SignalResult


def sig(signal_type, score, status="available"):
    return SignalResult(
        signal_type=signal_type, score=score, confidence=0.8,
        severity="medium", status=status,
    )


AGREEING = [sig("spatial", 0.8), sig("frequency", 0.7), sig("compression", 0.75)]
DISAGREEING = [sig("spatial", 0.8), sig("frequency", 0.3)]


def test_directional_agreement_all_agree():
    assert directional_agreement(AGREEING) == 1.0


def test_directional_agreement_disagree():
    assert directional_agreement(DISAGREEING) == 0.0


def test_agreement_score_range_and_direction():
    hi = agreement_score(AGREEING)
    lo = agreement_score(DISAGREEING)
    assert 0.0 <= lo <= hi <= 1.0


def test_agreement_ignores_insufficient():
    signals = [*AGREEING, sig("metadata", None, status="insufficient_evidence")]
    assert agreement_score(signals) == agreement_score(AGREEING)


def test_single_signal_agrees_with_itself():
    assert directional_agreement([sig("spatial", 0.9)]) == 1.0


def test_detect_inconsistencies_finds_opposing_pair():
    found = detect_inconsistencies([sig("spatial", 0.85), sig("frequency", 0.2)])
    assert len(found) == 1
    assert {found[0]["signal_a"], found[0]["signal_b"]} == {"spatial", "frequency"}


def test_detect_inconsistencies_ignores_weak_gap():
    found = detect_inconsistencies([sig("spatial", 0.55), sig("frequency", 0.45)])
    assert found == []


def test_modality_coverage_image():
    cov = modality_coverage([sig("spatial", 0.5)], MediaType.image.value)
    assert cov["visual"] == ["spatial"]
    assert cov["provenance"] == []  # metadata signal not present


def test_build_consensus_shape():
    consensus = build_consensus(AGREEING, MediaType.image.value)
    assert isinstance(consensus, CrossModalSummary)
    assert consensus.directional_agreement == 1.0
    assert consensus.considered_signals == len(AGREEING)
    d = consensus.to_dict()
    assert "agreement_score" in d and "directional_agreement" in d
    assert d["label"] in {"consistent", "weakly-consistent", "inconsistent", "disagreement-detected"}
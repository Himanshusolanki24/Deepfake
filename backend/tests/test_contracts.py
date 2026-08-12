from __future__ import annotations

import asyncio

from app.db.enums import MediaType
from app.forensic.interface import BaseDetector, DetectorContext, available_signal
from app.forensic.signals import SignalResult, merge_signal


class DummyDetector(BaseDetector):
    name = "dummy-detector"
    family = "test"
    model_version = "dummy-v1"

    def base_limitations(self) -> list[str]:
        return ["always uncertain"]

    async def analyze(self, ctx: DetectorContext, **kwargs):
        return [self.signal(
            signal_type="dummy",
            score=2.5,
            confidence=1.5,
            severity="medium",
            explanation="x",
        )]


def test_signal_result_clamps_score_and_confidence():
    s = SignalResult(signal_type="x", score=2.0, confidence=-0.5, severity="high")
    assert s.score == 1.0
    assert s.confidence == 0.0


def test_signal_result_to_dict_contains_new_fields():
    s = SignalResult(
        signal_type="compression", score=0.4, confidence=0.9, severity="medium",
        detector_name="compression-analyzer",
        limitations=["a"], supporting_details=["b"], evidence=[{"kind": "frame"}],
    )
    d = s.to_dict()
    assert d["detector_name"] == "compression-analyzer"
    assert d["limitations"] == ["a"]
    assert d["supporting_details"] == ["b"]
    assert d["evidence"] == [{"kind": "frame"}]


def test_merge_signal_returns_copied_and_merged():
    base = SignalResult(
        signal_type="x", score=0.3, confidence=0.2, severity="low",
        details={"a": 1}, limitations=["l1"],
    )
    merged = merge_signal(base, score=0.9, details={"b": 2}, limitations=["l2"])
    assert merged is not base
    assert merged.score == 0.9
    assert merged.details == {"a": 1, "b": 2}
    assert merged.limitations == ["l1"]
    assert base.score == 0.3


def test_base_detector_signal_sets_detector_name_and_base_limitations():
    det = DummyDetector()
    results = asyncio.run(det.analyze(DetectorContext.for_media(MediaType.image.value, "sample.png")))
    assert len(results) == 1
    s = results[0]
    assert s.score == 1.0  # clamped
    assert s.detector_name == "dummy-detector"
    assert s.model_version == "dummy-v1"
    assert s.limitations == ["always uncertain"]


def test_available_signal():
    ok = SignalResult(signal_type="a", score=0.2, confidence=0.1, severity="low")
    no_score = SignalResult(signal_type="a", score=None, confidence=0.1, severity="low")
    not_available = SignalResult(signal_type="a", score=0.2, confidence=0.1, severity="low", status="insufficient_evidence")
    assert available_signal(ok) is True
    assert available_signal(no_score) is False
    assert available_signal(not_available) is False


def test_detector_context_carries_media_facts():
    ctx = DetectorContext.for_media(MediaType.image.value, "sample.png", width=10, height=20)
    assert ctx.media.media_type == MediaType.image.value
    assert ctx.media.width == 10
    assert ctx.media.height == 20
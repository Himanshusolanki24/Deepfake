from __future__ import annotations

import numpy as np
import pytest

from app.evaluation.dataset import EvaluationDataset
from app.evaluation.scoring import (
    binary_metrics,
    detector_report,
    fpr_at_tpr,
    roc_auc,
)


def test_auc_perfect_separation():
    scores = [0.9, 0.8, 0.2, 0.1]
    labels = [True, True, False, False]
    assert roc_auc(scores, labels) == pytest.approx(1.0)


def test_auc_random_separation():
    n = 200
    rng = np.random.default_rng(3)
    scores = rng.random(n).tolist()
    labels = [bool(i < n // 2) for i in range(n)]
    auc = roc_auc(scores, labels)
    assert 0.3 < auc < 0.8


def test_auc_reversed_is_zero():
    scores = [0.1, 0.2, 0.8, 0.9]
    labels = [True, True, False, False]
    assert roc_auc(scores, labels) == pytest.approx(0.0)


def test_fpr_at_tpr_perfect():
    scores = [0.9, 0.8, 0.7, 0.1, 0.05]
    labels = [True, True, True, False, False]
    assert fpr_at_tpr(scores, labels, 0.95) == pytest.approx(0.0)


def test_fpr_at_tpr_unreachable():
    # Positive is the lowest-scoring sample => TPR crosses 1.0 only at FPR == 1.0.
    scores = [0.2, 0.1, 0.05]
    labels = [False, False, True]
    assert fpr_at_tpr(scores, labels, 0.95) == 1.0


def test_binary_metrics_threshold():
    scores = [0.9, 0.7, 0.3, 0.1]
    labels = [True, False, False, False]
    m = binary_metrics(scores, labels, threshold=0.5)
    assert m["tp"] == 1 and m["fp"] == 1 and m["tn"] == 2 and m["fn"] == 0
    assert m["recall"] == 1.0
    assert m["precision"] == 0.5


def test_detector_report_none_when_single_class():
    assert detector_report([0.5, 0.6], [True, True]) is None
    assert detector_report([], []) is None


def test_detector_report_fields():
    r = detector_report([0.9, 0.8, 0.3, 0.2], [True, True, False, False])
    assert r is not None
    assert r["auc"] == 1.0
    assert r["fpr_at_95_tpr"] == 0.0
    assert r["n_fake"] == 2 and r["n_real"] == 2


def test_dataset_from_dirs(tmp_path):
    real = tmp_path / "real"
    fake = tmp_path / "fake"
    real.mkdir()
    fake.mkdir()
    (real / "a.png").write_bytes(b"x")
    (fake / "b.png").write_bytes(b"x")
    (real / "notes.txt").write_text("skip me")
    ds = EvaluationDataset.from_dirs(str(real), str(fake), media_type="image")
    assert len(ds.samples) == 2
    assert ds.counts() == {"real": 1, "fake": 1}
    by_label = {s.label: s for s in ds.samples}
    assert by_label[False].path.endswith("a.png")
    assert by_label[True].path.endswith("b.png")
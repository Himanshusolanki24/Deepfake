from __future__ import annotations

from collections.abc import Sequence

import numpy as np

try:
    from scipy.stats import rankdata
except Exception:  # pragma: no cover - numpy fallback
    def rankdata(values: Sequence[float]) -> np.ndarray:
        arr = np.asarray(values, dtype=float)
        order = arr.argsort()
        ranks = np.empty_like(arr)
        ranks[order] = np.arange(1, len(arr) + 1, dtype=float)
        return ranks


def _as_arrays(scores: Sequence[float], labels: Sequence[bool]) -> tuple[np.ndarray, np.ndarray]:
    arr = np.asarray([float(s) for s in scores], dtype=float)
    labs = np.asarray([bool(lab) for lab in labels], dtype=bool)
    return arr, labs


def roc_auc(scores: Sequence[float], labels: Sequence[bool]) -> float:
    """Area under the ROC curve via the rank-sum (Mann-Whitney) identity.

    High scores must correspond to fake/manipulated (label True).
    """
    arr, labs = _as_arrays(scores, labels)
    n_pos = int(labs.sum())
    n_neg = int(len(labs) - n_pos)
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    ranks = rankdata(arr)
    sum_pos = float(ranks[labs].sum())
    auc = (sum_pos - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg)
    return float(np.clip(auc, 0.0, 1.0))


def _roc_points(scores: Sequence[float], labels: Sequence[bool]) -> list[tuple[float, float]]:
    arr, labs = _as_arrays(scores, labels)
    order = np.argsort(-arr)
    sorted_labels = labs[order]
    n_pos = int(sorted_labels.sum())
    n_neg = len(sorted_labels) - n_pos
    points: list[tuple[float, float]] = [(0.0, 0.0)]
    if n_pos == 0 or n_neg == 0:
        return points
    tpr = 0.0
    fpr = 0.0
    for label in sorted_labels:
        if label:
            tpr += 1.0 / n_pos
        else:
            fpr += 1.0 / n_neg
        points.append((round(fpr, 6), round(tpr, 6)))
    return points


def fpr_at_tpr(scores: Sequence[float], labels: Sequence[bool], target_tpr: float = 0.95) -> float:
    """False-positive rate at a given true-positive rate (FPR@95%TPR)."""
    points = _roc_points(scores, labels)
    best = 1.0
    found = False
    for fpr, tpr in points:
        if tpr >= target_tpr:
            best = min(best, fpr)
            found = True
    return best if found else 1.0


def binary_metrics(scores: Sequence[float], labels: Sequence[bool], threshold: float = 0.5) -> dict[str, float]:
    arr, labs = _as_arrays(scores, labels)
    preds = arr >= threshold
    tp = int(np.sum(preds & labs))
    fp = int(np.sum(preds & ~labs))
    tn = int(np.sum(~preds & ~labs))
    fn = int(np.sum(~preds & labs))
    accuracy = (tp + tn) / max(len(labels), 1)
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-9)
    fpr = fp / max(fp + tn, 1)
    return {
        "threshold": threshold,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "fpr": round(fpr, 4),
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
    }


def detector_report(scores: Sequence[float], labels: Sequence[bool]) -> dict[str, float] | None:
    """Full per-detector metric set; ``None`` when either class is absent."""
    arr, labs = _as_arrays(scores, labels)
    n_pos = int(labs.sum())
    n_neg = int(len(labs) - n_pos)
    if n_pos == 0 or n_neg == 0 or len(arr) < 2:
        return None
    auc = roc_auc(arr.tolist(), labs.tolist())
    if np.isnan(auc):
        return None
    report = {
        "n_samples": int(len(arr)),
        "n_fake": n_pos,
        "n_real": n_neg,
        "auc": round(auc, 4),
        "fpr_at_95_tpr": round(fpr_at_tpr(arr.tolist(), labs.tolist(), 0.95), 4),
    }
    report.update(binary_metrics(arr.tolist(), labs.tolist(), threshold=0.5))
    return report
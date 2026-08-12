from __future__ import annotations

import argparse
import asyncio
import sys
from collections import defaultdict
from typing import Any

from ..forensic.pipeline import AnalysisPipeline
from ..ml.model_registry import ENGINE_VERSION
from ..services.storage_service import StorageService
from .dataset import EvaluationDataset, LabeledSample
from .report import write_report
from .scoring import detector_report


async def _score_sample(pipeline: AnalysisPipeline, sample: LabeledSample) -> dict[str, float | None]:
    try:
        outcome = await pipeline.run(sample.path, sample.media_type, "evaluation")
    except Exception:
        return {}
    return {
        s.signal_type: s.score
        for s in outcome.signals
        if s.score is not None and s.status == "available"
    }


async def _run_evaluation(dataset: EvaluationDataset, media_type: str | None) -> dict[str, Any]:
    pipeline = AnalysisPipeline(StorageService.from_settings())
    per_signal: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"scores": [], "labels": [], "total": 0}
    )
    for sample in dataset.samples:
        scores = await _score_sample(pipeline, sample)
        for sig, score in scores.items():
            per_signal[sig]["scores"].append(score)
            per_signal[sig]["labels"].append(sample.label)
        for bucket in per_signal.values():
            bucket["total"] += 1

    detectors: dict[str, Any] = {}
    coverage: dict[str, dict[str, int]] = {}
    for sig, bucket in per_signal.items():
        report = detector_report(bucket["scores"], bucket["labels"])
        if report is None:
            continue
        detectors[sig] = report
        coverage[sig] = {"scored": len(bucket["scores"]), "total": bucket["total"]}

    return {
        "engine_version": ENGINE_VERSION,
        "model_mode": "mock",
        "media_type": media_type or "mixed",
        "n_samples": len(dataset.samples),
        "n_fake": dataset.counts()["fake"],
        "n_real": dataset.counts()["real"],
        "detectors": detectors,
        "coverage": coverage,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate forensic engine detectors")
    parser.add_argument("--real-dir", help="directory of authentic media")
    parser.add_argument("--fake-dir", help="directory of fake/manipulated media")
    parser.add_argument("--manifest", help="CSV/JSONL manifest (path,label columns)")
    parser.add_argument("--media", choices=["image", "video", "audio"], default=None)
    parser.add_argument("--limit", type=int, default=None, help="max samples to score")
    parser.add_argument("--out", default="evaluation-report.json", help="output file (.json or .md)")
    args = parser.parse_args(argv)

    if args.manifest:
        dataset = EvaluationDataset.from_manifest(args.manifest, args.media, args.limit)
    elif args.real_dir and args.fake_dir:
        dataset = EvaluationDataset.from_dirs(args.real_dir, args.fake_dir, args.media, args.limit)
    else:
        parser.error("provide --real-dir + --fake-dir, or --manifest")

    if not dataset.samples:
        print("No matching samples found.", file=sys.stderr)
        return 2

    metrics = asyncio.run(_run_evaluation(dataset, args.media))
    out = write_report(metrics, args.out)
    print(f"wrote {out}")
    for sig, m in sorted(metrics["detectors"].items()):
        print(f"  {sig:22} AUC={m['auc']:.3f}  FPR@95%TPR={m['fpr_at_95_tpr']:.3f}  Acc={m['accuracy']:.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
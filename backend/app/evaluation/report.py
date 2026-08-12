from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def markdown_report(metrics: dict[str, Any]) -> str:
    lines = [
        "# AUTHENTIQ engine evaluation",
        "",
        f"- Engine version: `{metrics.get('engine_version')}`",
        f"- Model mode: `{metrics.get('model_mode')}`",
        f"- Samples: `{metrics.get('n_samples')}` "
        f"(fake={metrics.get('n_fake')}, real={metrics.get('n_real')})",
        f"- Media type: `{metrics.get('media_type') or 'mixed'}`",
        "",
        "## Per-detector discriminative performance",
        "",
        "| signal | AUC | FPR@95%TPR | Acc@0.5 | F1@0.5 | n_fake | n_real |",
        "|--------|-----|-----------|---------|--------|--------|--------|",
    ]
    for sig, m in sorted(metrics.get("detectors", {}).items()):
        lines.append(
            f"| {sig} | {m['auc']:.3f} | {m['fpr_at_95_tpr']:.3f} "
            f"| {m['accuracy']:.3f} | {m['f1']:.3f} | {m['n_fake']} | {m['n_real']} |"
        )
    lines += ["", "## Detector coverage", ""]
    for sig, info in sorted(metrics.get("coverage", {}).items()):
        lines.append(f"- {sig}: produced a score on {info['scored']}/{info['total']} samples")
    return "\n".join(lines) + "\n"


def write_report(metrics: dict[str, Any], out: str) -> str:
    p = Path(out)
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.suffix.lower() in {".md", ".markdown"}:
        p.write_text(markdown_report(metrics), encoding="utf-8")
    else:
        p.write_text(json.dumps(metrics, indent=2, default=str), encoding="utf-8")
    return str(p)
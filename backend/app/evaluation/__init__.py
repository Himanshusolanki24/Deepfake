from __future__ import annotations

"""Offline evaluation harness for the forensic engine.

Run::

    python -m app.evaluation.runner --real-dir <dir> --fake-dir <dir> --out report.json

Scores each labeled sample with the production ``AnalysisPipeline`` (mock or
real models depending on settings) and reports per-detector discriminative
metrics (AUC, FPR@95%TPR, accuracy, F1).
"""

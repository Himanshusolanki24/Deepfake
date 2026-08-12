# AUTHENTIQ Forensic Engine — Implementation Plan

Scope: upgrade the existing FastAPI backend into a research-grade, explainable
deepfake detection engine matching the specification. The baseline (verified
boot + end-to-end image analysis) is preserved; the plan is a superset.

## Ground truth of the baseline
- API: `app/api/router.py` (api_router: health/upload/analysis/websocket), `app/api/compat.py` (frontend bare-payload routes). Envelope + compat both served. ~20 routes on `/api/v1`.
- Pipeline: `app/forensic/pipeline.py` orchestrates image/video/audio analyzers -> evidence -> fusion (`evidence_based`/`logistic`/`weighted`) -> calibration -> verdict -> storage.
- Signals: `app/forensic/signals.py` `SignalResult` dataclass + typed results.
- Models: `app/ml/model_registry.py` `ModelSpec`/`ModelRegistry` with mock mode.
- Service: `app/services/analysis_service.py` persists signals/evidence/frames and builds the superset `AnalysisResponse`.
- Workers: `use_in_process_tasks` for async processing; `app/db/models.py` ORM.
- Tests: `tests/` pytest suite.

## Build order
1. **Contracts** (spec §7, §14): ~~unify `SignalResult` + typed result dataclasses into one `DetectorOutput` contract; `Detector` Protocol + `BaseDetector` adapter; all detectors conform~~ DONE (`forensic/interface.py`, `forensic/signals.py`).
2. **Media engine** (spec §11):~~ `media_quality` (resolution, bitrate, compression, duration) + normalization (deinterlace, standardize, codec) + quality-gated severity adjustment + `MediaQuality` in report~~ DONE (`forensic/media/quality.py`; image+video; audio returns None by design). Audio quality assessment is a possible future extension.
3. **Cross-modal** (spec §6): ~~`evidence_engine.py` (`localize`, `contextualize`, `consolidate`, `rank`), signal-agreement/consistency checks across modalities, `disagreement` flag in report~~ DONE (`forensic/evidence_engine.py`: `agreement_score`, `context_notes`, `build_consensus`; disagreement drives uncertainty — see item 4).
4. **Fusion** (spec §8): ~~`fusion/evidence_based.py` -> **signal agreement** (`agreement_score`, disagreement-based uncertainty widening), `fusion/calibration.py` -> `calibrate_with_interval`~~ DONE (`calibrate_with_interval(probability, *, uncertainty, n_signals)`; `VerdictConfig.widen`). Note: discrepancy — judgement of fused verdict is `inconclusive` in mock env because available signal evidence is genuine (light/hesitation) and mock models do not push any signal past the suspicious threshold.
5. **Verdicts** (spec §10): ~~`verdict_engine.py` — `assess()` threshold config, `severity_for_score()`, evidence-strength-aware threshold widening~~ DONE (`forensic/verdict_engine.py`; `fusion/scoring.py` re-exports).
6. **New detectors** (spec §3-5): ~~image **compression** (JPEG artifacts/ELA reuse, blockiness, duplicate-MB detection), image **ai-generated** (abstraction detection: palette/sharpness/noise model), video **lighting** (uniformity/entropy/physiological reference), video **face tracking** (identity consistency, IoU, trajectories), audio **synthetic speech** abstraction (spectral flatness + MPEG-4 AAC artifacts)~~ DONE (`compression.py`, `ai_generated.py`, `video/lighting.py`, `video/face_tracking.py` w/ `video/face_detection.py` OpenCV-5 shim, `audio/synthetic_speech.py` dependency-free stdlib+NumPy). Legacy `CascadeClassifier` in `spatial.py` still guarded by try/except; `rppg.py` already patched.
7. **Registry/adapters** (spec §13): ~~expand `ModelSpec`; `ModelAdapter` Protocol + `predict()`; compose per-family adapters~~ DONE (`ml/model_registry.py` 12 models + `ENGINE_VERSION`; `ml/adapters.py` TorchVision/Onnx/Mock; `ml/inference.py` `model_version` on Protocols).
8. **Evidence & storage** (spec §12, §18): ~~persist evidence limitations/supporting-details; new columns (`media_quality`, evidence `limitations`)~~ DONE (models + `init_db` auto-migration; new `SignalResult` columns `detector_name`/`limitations`/`supporting_details` + `Analyses.media_quality_json`/`cross_modal_json`/`uncertainty`/`agreement_score`/`engine_version`; per-signal evidence persisted inside `details.evidence` and surfaced via `SignalResultOut.evidence`).
9. **Obs/API** (spec §17, §28): ~~progress stages extended; `/api/v1/health` includes engine version + calibration stats; report carries `cross_modal`, `media_quality`, `limitations` per signal~~ DONE (response now carries `cross_modal`, `media_quality`, `uncertainty`, `signal_agreement`, `engine_version`, per-signal `limitations`/`supportingDetails`/`evidence`/`detectorName`). Health checks deferred to item 11.

Now (remaining):
10. **Tests** (spec §21): **DONE** — `tests/` created: 76 passing (`pytest -q`) covering mime sniffing (incl. WAV/WebP regression), signal contract/merge, image detectors, dependency-free synthetic-speech, media quality, evidence/agreement engine, fusion+calibration+verdicts, model registry/adapters, evaluation scoring, and upload→complete integration for image/video/audio + health + compat. `ruff check app/ tests/` clean; mypy clean on all new/modified modules (repo mypy total is baseline-only errors).
11. **Evaluation** (spec §22-23): **DONE** — `app/evaluation/` (`dataset.py` dirs+manifest, `scoring.py` ROC/AUC/FPR@95TPR/PR with scipy-rankdata + numpy fallback, `report.py` JSON/MD, `runner.py` CLI `python -m app.evaluation.runner --real-dir … --fake-dir … --out …`). Validated live on synthetic image set (per-detector metrics emitted).
12. **Obs/API polish**: **DONE** — `/api/v1/health` now reports `engine_version`, `model_count`, `registered_models`, `calibration.method`; compat `/analyze` + `/analysis/{id}` parity verified carrying all new fields.

Optional follow-ups (not required by backcompat contract):
- Audio fidelity quality module (currently `media_quality` is `null` for audio by design).
- Supply `settings.face_detector_model_path` (YuNet) to activate face-track/rPPG evidence in real mode.

## Backcompat contract (must hold)
- `/api/v1/analyze/{media_type}` + compat routes unchanged signatures; response is superset.
- `AnalysisResponse` schema only gains optional fields (`media_quality`, `cross_modal`, `signal_agreement`, `engine_version`).
- `SignalResult` gains optional `limitations`, `supporting_details`; existing fields unchanged.
- Mock mode remains deterministic and fast; new detectors degrade gracefully.
- `AnalysisStatus`/`Verdict` enums unchanged.

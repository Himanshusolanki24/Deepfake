# AUTHENTIQ — Full Project Overview & Architecture

> Explainable multi-signal digital media authenticity (deepfake) verification.
> This document walks the entire codebase — every file, every layer, every dependency —
> and closes with an honest engineering assessment.

---

## 1. What This Project Is

AUTHENTIQ is a full-stack deepfake / media-authenticity verification platform. A user uploads an
image, video, or audio file; the system runs several **independent forensic signals** (spatial
artifacts, frequency-domain anomalies, temporal consistency, physiological/rPPG, audio-visual
sync, audio spectral/prosody, metadata & provenance); fuses the signals into a **calibrated
probability of manipulation**; maps it to a verdict (`authentic / inconclusive / suspicious /
manipulated`); and surfaces explainable evidence — heatmaps, frequency charts, suspicious
frames, spectrograms, timelines, and printable reports.

Two important design postures (visible throughout the code):

- **"Never a naive real/fake binary."** The API returns calibrated confidence, a confidence
  interval, per-signal scores and human-readable explanations instead of a single boolean.
- **"Works fully in demo/mock mode."** Both backend (`USE_MOCK_MODELS=true`) and frontend
  (`NEXT_PUBLIC_USE_MOCKS=true`) can run with zero ML weights, zero GPU, and zero external
  infra (no Postgres/Redis needed), so the whole product is demonstrable end-to-end.

---

## 2. Repository Layout

```
Deepfake/
├── backend/                     FastAPI (Python 3.9+) service
│   ├── app/
│   │   ├── main.py              App factory, middleware, error handler, media serving
│   │   ├── config.py            pydantic-settings, every tunable knob
│   │   ├── api/                 HTTP surface: v1 spec + frontend-compat + ws
│   │   ├── core/                exceptions, logging, middleware, metrics, ratelimit, security
│   │   ├── db/                  SQLAlchemy async models + enums + alembic
│   │   ├── forensic/            THE engine: signal analyzers + fusion/calibration
│   │   ├── ml/                  model registry + inference abstraction
│   │   ├── schemas/             Pydantic request/response contracts
│   │   ├── services/            analysis, evidence, media, reports, storage
│   │   ├── utils/               ffmpeg, files, hashing, timestamps
│   │   └── workers/             celery + in-process async task execution + progress
│   ├── alembic/                 DB migrations (template present, no versions yet)
│   ├── tests/  app/tests/       pytest scaffolding (subdirs exist, files not yet written)
│   ├── requirements*.txt        runtime / optional-ML / dev deps
│   ├── pyproject.toml           black/ruff/mypy/pytest/coverage config
│   └── conftest.py              test env defaults (SQLite in-memory, mock models)
│
└── frontend/                    Next.js 16 (App Router) web client
    ├── src/app/                 routes, root + (app) layouts, globals.css design tokens
    ├── src/components/          ui primitives, layout shell, feature components
    ├── src/hooks/               react-query hooks + progress/player hooks
    ├── src/lib/                 api client, constants, validators, utils
    ├── src/mocks/               mock data, seeded result factory, registry
    ├── src/store/               zustand stores (analysis + ui)
    ├── src/types/               shared TS contracts
    ├── check.mjs                Playwright route/console/overflow verification script
    └── package.json             deps + scripts (dev/build/lint)
```

**Scale:** backend `app/` ≈ 7,400 lines of Python across ~70 modules; frontend `src/` ≈ 9,600
lines of TS/TSX across 79 files (20 UI primitives, 8 routes).

---

## 3. Backend — Deep Dive

### 3.1 Stack

| Concern            | Choice                                                       |
|--------------------|--------------------------------------------------------------|
| Framework          | FastAPI 0.11x, Uvicorn (async)                               |
| Validation         | Pydantic v2 + pydantic-settings                              |
| ORM / DB           | SQLAlchemy 2.0 async; asyncpg (Postgres) **or** aiosqlite (dev/demo) |
| Migrations         | Alembic (env/mako scaffolding present)                       |
| Queueing           | Celery 5 + Redis — but **in-process asyncio tasks by default** |
| Storage            | Local disk backend by default; S3 (boto3) ready              |
| Media processing   | OpenCV-headless, Pillow, NumPy, SciPy, librosa (optional)    |
| ML                 | scikit-learn, XGBoost, LightGBM, ONNX Runtime, mediapipe, torch (all optional) |
| Auth/security      | PyJWT (HS256), bcrypt (or scrypt fallback), API keys         |
| Observability      | JSON logging, request-ID context, Prometheus-style metrics, rate limiting |
| Testing/tooling    | pytest + pytest-asyncio, ruff, black, mypy, coverage         |

### 3.2 Application Bootstrap — `app/main.py`

`create_app()` assembles:

- **Middleware chain** (order matters): `RequestContextMiddleware` (request-id +
  timing), `AnalysisContextMiddleware`, `ExceptionHandlerMiddleware`, then CORS.
- **Router mounts**:
  1. `compat_router` (raw, un-prefixed) — endpoints shaped for the existing frontend
     (`/analyze/{media_type}`, `/analysis/history`, `/analysis/{id}`, `/media/...`).
  2. `v1_router` under `/api/v1` — versioned envelope responses (`ApiEnvelope{success,data,error,request_id}`).
  3. `auth_router` under `/api/v1`.
  4. `media_router` — serves stored artifacts with **path-traversal protection**
     (`resolve()` + `is_relative_to(root)` check).
- **Lifespan**: `setup_logging()` → `init_db()` (creates tables) → clean engine disposal.
- **Domain errors** return the standard envelope with `code`, `message`, and optional `details`.

### 3.3 Configuration — `app/config.py`

Everything is env-driven via a strongly typed `Settings` class (100% pydantic-settings):

- DB, Redis/Celery URLs + `use_in_process_tasks` (default **true**)
- Storage type (`local`/`s3`), retention days (30)
- Upload caps: 500 MB, 1800 s video/audio duration
- ML: `use_mock_models` (default true), device (cpu/cuda/mps), model cache dir
- Pipeline tuning: `sample_fps=2`, `max_frames=240`, `heatmap_alpha`, `enable_rppg`, rPPG min quality
- Security: JWT secrets/TTLs, bcrypt rounds, API-key TTL, idempotency TTL
- Rate limits per tier (`10/hour` anon, `100/hour` auth, `500/hour` API) — parsed by a
  `N/hour` string parser into per-hour counts
- Verdict thresholds: `authentic ≤ 0.30`, `inconclusive < 0.60`, `suspicious < 0.80`
- Log level/json, metrics toggle, CORS origins

### 3.4 API Surface

#### Versioned `/api/v1` (`app/api/`)
- **`upload.py`** — `POST /analyze/{media_type}` accepts a real multipart file **or** a JSON
  metadata body (demo mode). Returns immediately; processing is async. Also
  `POST /analyze/{media_type}/metadata`.
- **`analysis.py`** — CRUD: get, list history, delete, progress (mounted in `v1.py`).
- **`handlers.py`** — shared business logic used by **both** the compat and v1 routers
  (`create_analysis_handler`, `get_analysis_handler`, `list_history_handler`,
  `get_progress_handler`, `delete_analysis_handler`) — single source of truth.
- **`health.py`** — health/liveness probes.
- **`auth.py`** — register/login/refresh, API-key flows (JWT access+refresh pair).
- **`websocket.py`** — `WS /ws/analysis/{job_id}` live progress stream with a DB-polling
  fallback (works even without Redis pub/sub). Sends `connected → progress → completed|error`.
- **`reports.py`** — report generation/retrieval.
- **`compat.py`** (in `router.py`) — un-prefixed endpoints returning raw JSON (no envelope),
  plus media/evidence file serving.

#### Handler behaviour (`handlers.py` flow)
1. Validate/derive `media_type` (audio detection from MIME).
2. Accept file or metadata body; hash bytes (SHA-256); enforce size limits.
3. Create `Analysis` row (status `CREATED`), attach `MediaFile` (with `detected_media_type`).
4. Dispatch via `dispatch_analysis()` (see Workers).
5. Return `{ id }`.

### 3.5 Database — `app/db/`

- **`base.py`** — `UUIDPrimaryKeyMixin` (string UUID PKs, human-friendly), `TimestampMixin`.
- **`enums.py`** — `MediaType`, `AnalysisStatus` (CREATED→UPLOADING→QUEUED→PROCESSING→
  FUSING→CALIBRATING→COMPLETED/FAILED/CANCELLED), `Verdict`, `Severity`, `SignalType`,
  `EvidenceKind`, `JobStatus`, `SignalStatus`, `Role`.
- **`database.py`** — async engine/session factory; defaults to SQLite for dev, Postgres in prod.
- **`models/`**:
  - `analysis.py` — `Analysis` (verdict, calibrated/raw probability, CI lower/upper,
    explanation, idempotency key, unique(owner, media_sha256, model_set)), `MediaFile`
    (storage key, sha256, dims, duration, codec, `detected_media_type`), `SignalResult`
    (score/confidence/severity/status/model_version/JSON details), `SuspiciousFrame`,
    `MetadataRecord` (exif/c2pa/ELA/double-compression flags).
  - `evidence.py` — `Evidence` with `kind`, `artifact_uri`, timestamps, JSON metadata.
  - `job.py` — `AnalysisJob` (task name, queue, celery task id, status).
  - `report.py` — `Report` (storage key, format).
  - `user.py` — `User`, API keys, sessions.
- Relationships are `lazy="selectin"` throughout to avoid N+1 on detail reads.

### 3.6 Services — `app/services/`

- **`analysis_service.py`** — the orchestrator. Enforces a **strict state machine**
  (`STATE_TRANSITIONS` map). `run_analysis_job` drives: mark PROCESSING → create job → run
  pipeline with a `ProgressEmitter` → persist signals/frames/metadata/fused result → COMPLETED,
  or fail with `error_code`/`error_message`. `to_response()` assembles the full
  `AnalysisResponse` (signals, frequency data, heatmap regions, timeline, evidence, artifacts,
  models, limitations).
- **`media_service.py`** — upload handling, file typing, hashing.
- **`evidence_service.py`** — persists per-signal evidence rows.
- **`report_service.py`** — builds reports (HTML/PDF via weasyprint when available).
- **`storage_service.py`** — `LocalStorage`/`S3Storage` behind one interface; `url()`,
  `save()`, `get()`, `delete()`.

### 3.7 The Forensic Engine — `app/forensic/`

#### Pipeline — `pipeline.py`
`ForensicsPipeline` routes by media type and **emits progress events** at each stage:

- **Image** (`_run_image`): VALIDATION → spatial → frequency → metadata → heatmap (Grad-CAM-style)
  → persist artifacts (heatmap PNG, spectrum plot).
- **Video** (`_run_video`): probe → frame extraction (ffmpeg, 2 fps / ≤240 frames) → face
  detection → spatial on representative frames → frequency → temporal (optical flow) →
  audio extraction → A/V sync (mouth-openness vs audio envelope) → rPPG (optional) →
  metadata → spectral voice analysis → artifacts. **Placeholder/demo path**: if no ffmpeg or
  the uploaded file is a placeholder, deterministic mock signals are produced so the pipeline
  still demonstrates end-to-end.
- **Audio** (`_run_audio`): spectral voice analysis + prosody/pitch, merged, + metadata.
- **Fusion** (`_fuse`): build `FusionInput` → `FusionEngine.predict` → `ProbabilityCalibrator`
  → `VerdictEngine.classify` → a human explanation string with the CI.

#### Signal analyzers
- **image/spatial.py** — facade over `build_spatial_detector()` (mock/heuristic/ONNX/torch).
- **image/frequency.py** — NumPy-DFT spectral analysis, anomaly bands vs natural baseline.
- **image/heatmap.py** — explainability heatmap generation (PNG artifact).
- **image/metadata.py** — EXIF, double-compression, suspicious software, C2PA, ELA.
- **video/frame_extractor.py** — ffmpeg sampling.
- **video/landmarks.py** — face landmarking (mediapipe).
- **video/optical_flow.py** — motion field analysis.
- **video/temporal.py** — temporal consistency + suspicious frame/segment flags.
- **video/rppg.py** — remote photoplethysmography from skin-color variation; **honestly returns
  `insufficient_evidence`** when the face isn't visible enough (never fabricates).
- **video/av_sync.py** — lip-openness ↔ audio-envelope correlation (SyncNet-lite, no heavy model).
- **audio/voice_detector.py** — spectral/vocoder fingerprinting.
- **audio/spectrogram.py** — spectrogram artifact image.
- **audio/prosody.py** — pitch/prosody/breath-naturalness.

#### Fusion & calibration (`fusion/`)
- **meta_classifier.py** — `FusionEngine`: loads an XGBoost/LightGBM model **if** present,
  else a transparent **weighted ensemble** (weights × per-signal confidence), with a small
  "agreement boost" when many independent signals concur. Returns `(probability, confidence)`.
- **calibration.py** — `ProbabilityCalibrator`: isotonic regression (sklearn) → Platt
  fallback → conservative prior-blend (0.5 + 0.85·(raw−0.5)) when no calibration data.
  Computes a **Wilson-style confidence interval** and widens it on ambiguity.
- **scoring.py** — `VerdictEngine`: threshold mapping with the inconclusive band widened by low
  signal confidence. Never emits "100% fake" language.
- **types.py / signals.py** — dataclass result types and signal metadata.

### 3.8 ML Layer — `app/ml/`

- **model_registry.py** — singleton `ModelRegistry` describing every model: id, version,
  framework, device, `is_mock`, input size, file checksum. `snapshot()` fingerprints the model
  set for dedupe/caching. Version labels like `spatial-v1` surface in the UI.
- **inference.py** — `build_*_detector()` factories return the right implementation for the
  configured mode (mock heuristic vs real model), keeping the pipeline decoupled.

### 3.9 Workers — `app/workers/`

- **tasks.py** — `dispatch_analysis()`: in-process mode spins an **asyncio task**; otherwise
  sends a Celery task to the media-type queue with an `AnalysisJob` row and a **fallback to
  in-process on failure**. Celery tasks (`process_image/video/audio_analysis`) are registered
  on import so worker and dispatcher share names.
- **progress.py** — `ProgressEmitter` writes `ProgressEvent`s to DB; `ProgressEventStream`
  used by WebSocket (pub/sub or DB polling).
- **executor.py / celery_app.py** — Celery wiring.

### 3.10 Core infrastructure — `app/core/`

- **exceptions.py** — typed domain errors (`AuthentiqError`, `InvalidMediaError`,
  `InvalidStateTransitionError`, `AnalysisNotFoundError`, `AuthorizationError`,
  `ModelNotFoundError`, …).
- **middleware.py** — request context (ID, timing), analysis context, exception handler.
- **logging.py** — JSON logging with request-id correlation.
- **metrics.py** — Prometheus-style counters/histograms.
- **ratelimit.py** — per-tier, per-client rate limiting (in-memory; Redis-ready).
- **security.py** — JWT encode/decode, bcrypt with **scrypt fallback**, API-key generation
  (`ak_` prefixed) + SHA-256 hashing, internal filename generation.

### 3.11 Tests & Tooling

- `pyproject.toml` configures **black, ruff (E/F/I/UP/B/S), mypy (pydantic plugin),
  pytest (asyncio auto mode, integration/security markers), coverage fail_under=60**.
- `conftest.py` defaults tests to **SQLite in-memory, in-process tasks, mock models**.
- ⚠️ **`tests/` and `app/tests/` currently contain only empty scaffolding**
  (`forensic/`, `integration/`, `unit/` subfolders) — the test suite has not been written yet.
  The infrastructure is ready; the cases are not.

---

## 4. Frontend — Deep Dive

### 4.1 Stack

| Concern          | Choice                                                        |
|------------------|---------------------------------------------------------------|
| Framework        | Next.js **16.3.0** (App Router, Turbopack), React 19.2         |
| Styling          | Tailwind CSS **v4** (CSS-first `@theme inline` tokens, no config file) |
| Animations       | motion/react (Framer Motion successor) 13, custom keyframes    |
| Data             | TanStack Query 5, Zustand 5 (persist middleware), react-dropzone |
| Forms            | react-hook-form + zod 4                                        |
| Charts/visuals   | Recharts 3, custom canvas heatmap viewer, web-audio waveform   |
| UI primitives    | Radix UI (dialog, dropdown, select, tabs, slider, switch, tooltip, …) |
| Toasts           | sonner                                                        |
| Fonts            | Geist / Geist Mono (next/font)                                |

### 4.2 Routing (`src/app/`)

Route group `(app)` is wrapped by `AppShell` (sidebar + header + mobile nav).

| Route                          | Purpose                                                     |
|--------------------------------|-------------------------------------------------------------|
| `/`                            | Dashboard: greeting, KPIs w/ sparklines, activity chart, quick dropzone, recent analyses |
| `/analyze`                     | 3-step wizard (Upload → Configure signals → Analyze/processing) |
| `/history`                     | Searchable/filterable case table, multi-select, pagination, delete/compare/export |
| `/batch`                       | Multi-file queue with per-item status and live summary      |
| `/evidence`                    | Evidence library browser (heatmaps/frames/spectra/spectrograms) + viewer modal |
| `/compare?a=&b=`               | Side-by-side verdicts, signal bar chart, per-signal delta + "key difference" strip |
| `/reports`                     | Report catalog                                         |
| `/api`                         | API docs page, key management, usage gauges                 |
| `/settings`                    | Vertical-tab settings (General, Detection, Notifications, Security, API, Privacy) |
| `/analysis/[id]`               | Full investigation page (assessment → investigation → evidence → frequency → metadata → timeline) |
| `/analysis/[id]/report`        | Printable forensic report (HTML print stylesheet)           |

### 4.3 Layout Shell

- **`AppShell.tsx`** — sticky, height-locked sidebar (260px ↔ 72px animated collapse via
  `uiStore.sidebarCollapsed`), content area without padding hacks.
- **`Sidebar.tsx`** — nav sections (Workspace / Platform), active-left-bar indicator, tooltips
  in collapsed mode, system-status dot, collapse toggle.
- **`Header.tsx`** — 64px bar: collapse toggle (desktop), mobile menu, friendly breadcrumbs
  (route-label map, case IDs rendered mono), ⌘K search dialog, notifications, user menu.
  Also exports `AnalysisCaseHeader` / `CaseIdLink` used on case pages.
- **`MobileNav.tsx` + `MobileSidebarDrawer.tsx`** — bottom nav + drawer for small screens.
- **Root layout** — Geist fonts, metadata/OG tags, `<Providers>` (QueryClient + TooltipProvider +
  sonner Toaster).

### 4.4 UI Primitives (`src/components/ui/`, 20 files)

`avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, **`drawer`** (custom bottom-sheet/
right-rail with hand-written keyframes to avoid transform conflicts), `dropdown-menu`, `input`,
`label`, `progress`, `scroll-area`, `select`, `separator`, `skeleton`, `slider`, `switch`,
`table`, `tabs`, `tooltip`.

### 4.5 Feature Components

- **Dashboard:** `StatCard` (KPI + delta chip + sparkline), `ActivityChart` (Recharts area).
- **Analysis:** `VerdictCard` (gauge + verdict + recommendation footer), `ConfidenceGauge`
  (270° gauge, tick marks, confidence-interval band, needle), `SignalBreakdown` (signals
  **grouped by category** — Visual/Temporal/Audio/Cross-Modal/Provenance), `EvidenceTimeline`,
  `ProcessingPipeline` (step list + progress + ETA + live log with severity-colored lines +
  "current operation" strip), `AnalysesTable`.
- **Forensic:** `HeatmapViewer` (custom canvas: procedural base face, gradient heat regions,
  region boxes, zoom/pan, **hover tooltip with anomaly %**, mode tabs, intensity slider),
  `FrequencyChart` (Recharts area + anomaly bands + legend + peak-deviation summary),
  `FrameInvestigation`, `VideoTimeline`, `AudioWaveform`, `AudioForensics` (waveform +
  spectrogram), `MetadataPanel`.
- **Upload:** `MediaDropzone` (drag/drop with visual active states, format badges, privacy
  copy, `MediaFileChip`), `MediaPreview` (image/video/audio previews).

### 4.6 Data Layer

- **`lib/api.ts`** — one `api` object. `USE_MOCKS` toggles every call between a mock path
  (with simulated latency) and `fetch` to `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
  Shared `request()` with timeout/abort + `ApiError` (status/code). `mockAnalyzeToId()` derives
  `VID-/IMG-/AUD-YYYY-XXXXX` IDs from filenames.
- **`hooks/useAnalysis.ts`** — `useHistory`, `useAnalysis(id)`, `useStartAnalysis` (mutation
  that optimistically seeds history + analysis caches with a built mock result),
  `useGenerateBatchResult`, `useMediaObjectUrl`.
- **`hooks/useAnalysisProgress.ts`** — simulated progress events + live-log line streamer.
- **`store/analysisStore.ts`** — current file/result, batch files, `pendingEntries`
  (dropzone → wizard handoff).
- **`store/uiStore.ts`** — UI state incl. persisted `sidebarCollapsed`.
- **`mocks/`** — `analyses.ts` (4 seeded DEMO cases + deterministic frequency generator),
  `resultFactory.ts` (**seeded by filename** so the same file always yields the same verdict),
  `registry.ts` (register/lookup generated results), `evidence.ts`.
- **`types/`** — `analysis.ts` (full result contract + verdict constants), `media.ts`,
  `evidence.ts`.
- **`lib/constants.ts`** — processing steps, signal catalog + **category mapping**, legal &
  privacy copy.
- **`lib/validators.ts`** — upload validation rules.

### 4.7 Design System (`globals.css`)

Tailwind v4 `@theme inline` tokens: neutral surface (`#f6f7f9` bg, `#111827` fg, `#e5e7eb`
border), verdict semantic palette (`authentic #16a34a`, `suspicious #d97706`,
`manipulated #dc2626`, `inconclusive #64748b`, `info #2563eb`, each with a `-soft` tint),
dark **sidebar palette** (`#0b1322` rail), radius scale, shadow scale (`xs→card`), focus ring,
custom `grid-paper` background and `hex-mono` type utilities, plus drawer keyframes.

### 4.8 Verification Tooling

- **`check.mjs`** (Playwright): scans all routes for console errors, horizontal overflow,
  and missing shell elements across desktop / 390px mobile / 768px tablet — currently **all
  green**.
- Lint/typecheck: `eslint` (React 19 hooks rules, e.g. `react-hooks/refs`,
  `set-state-in-effect`) and `tsc --noEmit` — both clean.

---

## 5. End-to-End Flow (demo mode)

```
User drops file
   → MediaDropzone → pendingEntries (zustand)
   → /analyze wizard → Configure (per-category signals)
   → useStartAnalysis:
       api.analyzeMedia(...)  → POST /analyze/image  (or mock: returns VID-/IMG-/AUD- id)
       buildUploadedResult()  → seeded mock result, cached in react-query
   → ProcessingPipeline (animated steps + live log, ~8s)
   → /analysis/[id]           → VerdictCard gauge + grouped signals + forensic visualizers
   → /analysis/[id]/report    → printable PDF-style report
   → /history                 → new case appears (optimistic cache update)
   → /compare, /batch, /evidence, /reports  → derived workflows
```

With the real backend: `POST /api/v1/analyze/{type}` (multipart) → SQLite/Postgres rows →
`dispatch_analysis()` (in-process task or Celery) → `ForensicsPipeline` emits progress to
DB/WS → client polls `GET /analysis/{id}/progress` or streams over WS → COMPLETED →
`GET /analysis/{id}` returns the full `AnalysisResponse`.

---

## 6. Security & Production Notes

- **Strengths:** path-traversal guards on media serving; password hashing with bcrypt +
  scrypt fallback; JWT with TTLs + JTI; API keys stored as SHA-256; rate limiting per tier;
  idempotency keys; strict analysis state machine; ownership checks on reads/deletes;
  upload size limits; configurable retention (30 days); CORS allow-list; JSON structured logs
  with request IDs; coverage gate configured.
- **Caveats:** default `jwt_secret_key`/`cors_origins` are dev defaults (must be overridden in
  prod via `.env`); rate limiter is in-memory (single-process) unless backed by Redis; storage
  defaults to local disk; the S3 path is implemented but unexercised.

---

## 7. Honest Engineering Assessment

### What's strong
1. **Explainability-first product thinking.** Calibrated probabilities, confidence intervals,
   per-signal scores, and "not enough evidence" honesty (rPPG) are unusually mature for a demo
   platform. The verdict language deliberately avoids false certainty.
2. **Architecture is genuinely layered.** API routers → shared handlers → service layer → DB;
   a decoupled forensic pipeline with per-signal analyzers; a clean fusion/calibration seam;
   model registry decoupling inference from code. Someone could swap a mock detector for a
   trained ONNX model without touching the pipeline.
3. **Dual-mode (mock/real) done right.** A single config flag flips both sides; the mock mode
   is *deterministic* (seeded by filename) so demos are stable and reproducible.
4. **Resilience-minded execution.** In-process task fallback when Redis/Celery is down;
   WebSocket with DB-polling fallback; progress events persisted; state-machine-guarded
   transitions; graceful "insufficient evidence" everywhere.
5. **Frontend craft.** Cohesive forensic-dark UI, consistent design tokens, a real stepper
   wizard, animated processing pipeline with live log, a canvas heatmap viewer with tooltips,
   grouped signal breakdown, evidence drawer, vertical settings tabs, hydration-safe greeting,
   and zero console errors across all routes on all breakpoints (verified).
6. **Security hygiene** (traversal guards, hashing, rate limits, TTLs) shows production intent.

### Where it's weak / would improve
1. **Tests are missing.** `pytest` infra (conftest, markers, coverage gate) is configured but
   no test files exist. Coverage `fail_under=60` would currently fail. **Highest-value next
   step:** unit tests for fusion/calibration/verdict thresholds + integration tests for the
   upload→complete lifecycle + API security tests.
2. **Backend mostly heuristic/mock.** With `use_mock_models=true` (the default), signals are
   deterministic heuristics or hardcoded mocks rather than trained detectors. That's fine for a
   demo, but "deepfake detection" accuracy claims should be clearly scoped until real models
   are dropped in.
3. **Frontend mocks shadow the real API.** `NEXT_PUBLIC_USE_MOCKS` defaults to true, so the
   real backend paths are untested by default; the mock `resultFactory` bypasses the wire
   schema, so drift between `AnalysisResponse` (backend) and `AnalysisResult` (frontend) is a
   real risk once mocks are disabled. A contract test (openapi → TS types) would close it.
4. **Some scope creep / placeholder pages** (reports/evidence/api pages are largely static
   mock views), and a few dead-code remnants were cleaned up during the UI polish pass.
5. **Migration discipline:** `alembic/versions/` is empty; schema is created via `init_db()`
   (create_all). Fine for dev, but team collaboration needs real migrations.
6. **Observability polish:** metrics exist but no exported dashboards; rate limiter is
   in-memory.

### Overall grade: **B+ → A-**
As a *product/demo/architecture exercise* it's excellent — thoughtful domain modeling, clean
separation of concerns, production-minded security and resilience, and a genuinely polished
frontend. It is not yet a *production ML service* because the actual trained models and the
test suite are missing. With real detector weights, a contract-tested API boundary, and the
test suite filled in, this comfortably reaches A-tier.

---

## 8. How to Run

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt            # core; add requirements-ml.txt for ML stack
cp .env.example .env                        # adjust as needed (defaults: SQLite + mock models)
uvicorn app.main:app --reload --port 8000
# Open http://localhost:8000/docs for Swagger
```

**Frontend**
```bash
cd frontend
npm install
npm run dev -- -p 3001                      # default API target: http://localhost:8000
# Open http://localhost:3001
# NEXT_PUBLIC_USE_MOCKS=false in .env.local to hit the real backend
```

**Checks**
```bash
cd frontend && npx tsc --noEmit && npm run lint
node check.mjs                              # Playwright route/console/overflow scan (server must be running)
cd backend && ruff check app && mypy app    # formatting/typing (test suite not yet written)
```

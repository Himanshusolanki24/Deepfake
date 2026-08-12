# AUTHENTIQ

Explainable deepfake and digital-media authenticity verification platform.

AUTHENTIQ analyzes images, videos, and audio for signs of synthetic generation
or manipulation, fuses independent forensic signals into a calibrated verdict,
and produces per-signal scores, evidence artifacts (heatmaps, frequency plots,
spectrograms), suspicious-frame/segment timelines, and downloadable forensic
reports.

```
┌────────────────────┐        HTTP/JSON        ┌────────────────────────────┐
│   Next.js 16 app   │  ─────────────────────► │   FastAPI (async) backend  │
│  (React 19 / UI)   │ ◄─────────────────────  │   REST + WebSocket (SSE)   │
└────────────────────┘                         └────────────┬───────────────┘
                                                            │ async SQLAlchemy
                                                   ┌────────▼────────┐
                                                   │ Postgres / SQLite│
                                                   └────────┬────────┘
                                                            │
              ┌──────────────────────────┬──────────────────┴───────────────────┐
              ▼                          ▼                                      ▼
      Forensic pipeline          Storage (local / S3)                Workers (Celery or
    image · video · audio           heatmaps, spectra,                in-process dispatch)
    + signal fusion                 spectrograms, reports
```

---

## Features

- **Multi-signal forensics** — spatial artifacts, frequency-domain anomalies,
  temporal/optical-flow consistency, metadata & provenance (EXIF / C2PA),
  physiological rPPG (video), audio-visual sync (video), and spectral/prosody
  voice analysis (audio).
- **Explainable verdicts** — each analysis returns a calibrated probability of
  manipulation, a confidence interval, a plain-language explanation, per-signal
  scores with severities, and human-readable evidence.
- **Calibrated confidence** — raw model scores are run through Platt scaling or
  isotonic regression (sklearn) so outputs are honest; a conservative prior
  blend is used when no calibration data exists.
- **Evidence artifacts** — generated heatmaps, frequency spectra, spectrograms,
  suspicious frames and suspicious segments, all servable from storage.
- **Forensic reports** — HTML and PDF reports per analysis.
- **Live progress** — progress events persisted per analysis and streamed over
  WebSocket / polled progress endpoints.
- **Auth & keys** — JWT register/login/refresh, API-key management with
  per-tier rate limiting, storage-backed and idempotent uploads.
- **Zero-infrastructure mode** — fully demonstrable without Redis, Celery, or
  PostgreSQL: in-process task dispatch, mock ML models, and SQLite.

---

## Repository layout

```
├── backend/                 FastAPI forensic backend
│   ├── app/
│   │   ├── api/            REST routes (auth, upload, analysis, reports, ws)
│   │   ├── core/           logging, security/JWT, rate limiting, metrics, exceptions
│   │   ├── db/             async SQLAlchemy models + enums
│   │   ├── forensic/       pipeline + per-signal analyzers
│   │   │   ├── image/      spatial · frequency · metadata · heatmap
│   │   │   ├── video/      frame extraction · temporal · rPPG · A/V sync
│   │   │   ├── audio/      spectral voice · prosody
│   │   │   └── fusion/     ensemble fusion · calibration · verdict engine
│   │   ├── ml/             model registry (mock vs real model specs)
│   │   ├── schemas/        Pydantic request/response models
│   │   ├── services/       analysis, media, storage, evidence, reports
│   │   ├── workers/        executor + Celery/in-process task dispatch
│   │   └── main.py         FastAPI app factory
│   ├── requirements.txt
│   └── pyproject.toml
└── frontend/                Next.js 16 console
    └── src/
        ├── app/(app)/      dashboard, analyze, history, batch, compare,
        │                   evidence, reports, settings, API-keys pages
        ├── components/     analysis, forensic, common, layout, ui (shadcn)
        ├── hooks/          useAnalysis, useAnalysisProgress, useMediaPlayer
        ├── lib/            API client + mocks, validators, utils
        ├── mocks/          offline demo data & result factory
        └── store/          Zustand stores
```

---

## Tech stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Backend    | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2 (async) |
| Workers    | Celery + Redis, or built-in in-process dispatch         |
| Storage    | Local filesystem, or S3 via `boto3`                     |
| Databases  | PostgreSQL (`asyncpg`) or SQLite (`aiosqlite`)          |
| Media      | OpenCV, NumPy/SciPy, Pillow, ffmpeg (video/audio)       |
| ML         | sklearn (calibration), onnxruntime/xgboost/lightgbm (opt), mediapipe (faces) |
| Frontend   | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Radix, TanStack Query, Zustand, Recharts |
| Reports    | weasyprint (HTML → PDF)                                 |

---

## Quick start

Requirements: **Python 3.12+**, **Node.js 20+**, **ffmpeg** (recommended for
video/audio).

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Zero-infrastructure mode: SQLite + mock models + in-process tasks
DATABASE_URL=sqlite+aiosqlite:///./dev.db \
USE_IN_PROCESS_TASKS=true \
USE_MOCK_MODELS=true \
uvicorn app.main:app --reload --port 8000
```

- Interactive API docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/v1/health>

Optional real-mode integrations (see [Configuration](#configuration)):

- **PostgreSQL**: set `DATABASE_URL=postgresql+asyncpg://...`.
- **Redis / Celery**: start Redis, set `USE_IN_PROCESS_TASKS=false`,
  `CELERY_BROKER_URL=...`, then run a worker with
  `celery -A app.workers.celery_app.celery_app worker -l info`.
- **Real models**: set `USE_MOCK_MODELS=false` and point the registry at model
  artifacts (see `app/ml/model_registry.py`).
- **ffmpeg**: required for frame sampling and audio extraction.

### 2. Frontend

```bash
cd frontend
npm install

# Mock/offline mode (default: no backend needed)
npm run dev

# Live mode against the backend
NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_USE_MOCKS=false npm run dev
```

Open <http://localhost:3000>.

---

## Configuration

Backend settings are read from environment variables (see
`backend/.env.example` and `backend/app/config.py`). Copy to `.env` to tweak:

```bash
cd backend && cp .env.example .env
```

Key variables:

| Variable                    | Default                                    | Purpose                                  |
|-----------------------------|--------------------------------------------|------------------------------------------|
| `DATABASE_URL`              | `postgresql+asyncpg://...`                 | Async DB connection (SQLite supported)   |
| `USE_IN_PROCESS_TASKS`      | `true`                                     | Run jobs in-process instead of Celery    |
| `USE_MOCK_MODELS`           | `true`                                     | Deterministic demo signals, no ML deps   |
| `REDIS_URL` / `CELERY_*`    | `redis://localhost:6379/…`                 | Broker when `USE_IN_PROCESS_TASKS=false` |
| `STORAGE_TYPE` / `STORAGE_PATH` | `local` / `./storage`                  | Artifact storage backend                 |
| `MAX_UPLOAD_SIZE_MB`        | `500`                                      | Upload limit                             |
| `JWT_SECRET_KEY`            | `change-me-in-production`                  | **Set in production**                    |
| `VERDICT_*_MAX`             | `0.30 / 0.60 / 0.80`                       | Verdict thresholds                       |
| `CORS_ORIGINS`              | `http://localhost:3000`                    | Comma-separated allow-list               |
| `RATE_LIMIT_*`              | `10/hour` etc.                             | Anonymous / authenticated / API tiers    |

Frontend env (`frontend/.env`):

- `NEXT_PUBLIC_API_URL` — backend base URL (default `http://localhost:8000`).
- `NEXT_PUBLIC_USE_MOCKS` — set to `"false"` to call the real API (default: mock).

---

## API overview

All versioned routes are prefixed with `/api/v1`. Unprefixed "compat" routes
(`/analyze/{media_type}`, `/analysis/...`, `/media/...`) mirror the same API for
frontend consumption.

| Method | Path                                          | Description                              |
|--------|-----------------------------------------------|------------------------------------------|
| POST   | `/api/v1/analyze/{media_type}`                | Upload & analyze media (`image/video/audio`) |
| POST   | `/api/v1/analyze/{media_type}/metadata`       | Create analysis from metadata only       |
| GET    | `/api/v1/analysis/history`                    | List recent analyses                     |
| GET    | `/api/v1/analysis/batch`                      | Latest-batch summaries                   |
| POST   | `/api/v1/analysis/batch`                      | Run analyses for pending uploads         |
| GET    | `/api/v1/analysis/{id}`                       | Full analysis result                     |
| GET    | `/api/v1/analysis/{id}/progress`              | Progress events                          |
| GET    | `/api/v1/analysis/{id}/evidence`              | Evidence artifacts                       |
| GET    | `/api/v1/analysis/{id}/report`                | HTML forensic report                     |
| GET    | `/api/v1/analysis/{id}/report/pdf`            | PDF forensic report                      |
| DELETE | `/api/v1/analysis/{id}`                       | Delete an analysis                       |
| POST   | `/api/v1/auth/register`                       | Create user                              |
| POST   | `/api/v1/auth/login`                          | JWT login                                |
| POST   | `/api/v1/auth/refresh`                        | Refresh access token                     |
| POST   | `/api/v1/auth/api-keys`                       | Issue an API key                         |
| GET / DELETE / POST | `/api/v1/auth/api-keys{...}`      | List / revoke / rotate keys              |
| WS     | `/api/v1/ws/analysis/{job_id}`                | Live analysis progress stream            |
| GET    | `/metrics`                                    | Service metrics                            |
| GET    | `/api/v1/health`                              | Service health + metrics                 |

---

## How analysis works

1. **Upload** — media is validated (type, size, duration limits), fingerprinted
   (SHA-256), stored, and an idempotent (`owner`, `media_hash`, `model_set`)
   analysis record is created.
2. **Dispatch** — the job runs in-process (default) or via Celery.
3. **Pipeline** (`app/forensic/pipeline.py`) — a media-type-specific sequence of
   detectors runs, each returning a `score`, `confidence`, `severity`, and an
   explanation:

   | Signal            | Applied to      | What it measures                                  |
   |-------------------|-----------------|---------------------------------------------------|
   | **spatial**       | image, video    | Blend/compression artifacts in spatial texture    |
   | **frequency**     | image, video, audio | Spectral anomalies vs natural capture         |
   | **temporal**      | video           | Landmark motion jitter, optical-flow discontinuities |
   | **av-sync**       | video           | Audio/visual stream synchronization               |
   | **rppg**          | video           | Remote photoplethysmography heart-rate           |
   | **audio**         | audio, video    | Spectral voice consistency, prosody, vocoder artifacts |
   | **metadata**      | all             | EXIF status, double compression, C2PA credentials |

4. **Fusion & calibration** (`app/forensic/fusion/`) — signals are combined by a
   weighted ensemble (or trained XGBoost/LightGBM when available), calibrated,
   and mapped to a verdict with a confidence interval.
5. **Verdict** — `authentic` / `inconclusive` / `suspicious` / `manipulated`,
   driven by the calibrated probability and thresholds
   (`0.30 · 0.60 · 0.80`).
6. **Artifacts** — heatmaps, frequency spectra, spectrograms, suspicious frames
   and segments are persisted and linked as evidence.
7. **Report** — an HTML (and optional PDF) forensic report is generated.

Progress events are recorded at each stage (validation → spatial → frequency →
temporal → metadata → fusion → calibration → finalizing) for live UI updates.

---

## What's mocked vs real

- **Mock models** (`USE_MOCK_MODELS=true`, default) provide deterministic,
  believable signal outputs so the full product flow works offline.
- **Real mode** requires model artifacts registered in
  `app/ml/model_registry.py` and optional ML dependencies
  (`onnxruntime`, `xgboost`, `lightgbm`, `mediapipe`).
- **Frontend mocks** (`NEXT_PUBLIC_USE_MOCKS !== "false"`) render demo analyses
  locally without a backend.

---

## Development

```bash
# Backend: lint & typecheck
cd backend
ruff check app && black --check app && mypy app

# Backend: tests (pytest + pytest-asyncio)
pytest

# Frontend
cd frontend
npm run lint
npm run build
```

This repository intentionally uses `create_all` on startup for tables; for
production you should switch to **Alembic** migrations (`alembic` is already a
dependency).

---

## Security notes

- `JWT_SECRET_KEY` and rate-limit defaults are for development only — override
  in production.
- Verified provenance (C2PA) and media authenticity are best-effort; a low
  signal is **not** proof of an authentic capture.
- Set `CORS_ORIGINS` and upload limits explicitly for your deployment.

## License

Proprietary / internal project.

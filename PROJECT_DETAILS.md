# AUTHENTIQ - Complete Project Documentation

> Deepfake and Digital Media Authenticity Verification Platform
> 
> Generated: August 12, 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Backend Details](#backend-details)
6. [Frontend Details](#frontend-details)
7. [ML Microservices](#ml-microservices)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Configuration](#configuration)
11. [Forensic Pipeline](#forensic-pipeline)
12. [Deployment](#deployment)

---

## Project Overview

**AUTHENTIQ** is an explainable deepfake and digital-media authenticity verification platform. It analyzes images, videos, and audio for signs of synthetic generation or manipulation, fuses independent forensic signals into a calibrated verdict, and produces per-signal scores, evidence artifacts (heatmaps, frequency plots, spectrograms), suspicious-frame/segment timelines, and downloadable forensic reports.

### Key Features

- **Multi-signal forensics** — spatial artifacts, frequency-domain anomalies, temporal/optical-flow consistency, metadata & provenance (EXIF / C2PA), physiological rPPG (video), audio-visual sync (video), and spectral/prosody voice analysis (audio)
- **Explainable verdicts** — calibrated probability of manipulation, confidence intervals, plain-language explanations, per-signal scores with severities
- **Calibrated confidence** — Platt scaling or isotonic regression calibration via sklearn
- **Evidence artifacts** — heatmaps, frequency spectra, spectrograms, suspicious frames/segments
- **Forensic reports** — HTML and PDF reports per analysis
- **Live progress** — progress events via WebSocket/SSE streaming
- **Auth & keys** — JWT authentication, API-key management with tiered rate limiting
- **Zero-infrastructure mode** — fully demonstrable without Redis, Celery, or PostgreSQL

---

## Architecture

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

### Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 16, React 19 | Web UI for analysis, history, reports |
| Backend API | FastAPI (async) | REST API, WebSocket, business logic |
| Database | PostgreSQL / SQLite | Persistent storage via async SQLAlchemy |
| Task Queue | Celery + Redis (optional) | Async job processing |
| Storage | Local filesystem / S3 | Media and artifact storage |
| ML Services | FastAPI microservices | Image, video, audio analysis |

---

## Technology Stack

### Backend Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Language | Python | 3.12+ |
| Web Framework | FastAPI | >=0.110, <1.0 |
| ASGI Server | Uvicorn | >=0.29 |
| Data Validation | Pydantic | >=2.6, <3.0 |
| Settings | pydantic-settings | >=2.2 |
| Database ORM | SQLAlchemy | >=2.0.25 (async) |
| Database Drivers | asyncpg, aiosqlite | >=0.29, >=0.20 |
| Migrations | Alembic | >=1.13 |
| Task Queue | Celery | >=5.3 |
| Cache/Broker | Redis | >=5.0 |
| Authentication | PyJWT | >=2.8 |
| Password Hashing | bcrypt | >=4.1 |

### ML/Science Stack

| Library | Version | Purpose |
|---------|---------|---------|
| numpy | >=1.26 | Numerical computing |
| scipy | >=1.12 | Scientific computing |
| Pillow | >=10.2 | Image processing |
| opencv-python-headless | >=4.9 | Computer vision |
| librosa | >=0.10 | Audio analysis |
| tensorflow-cpu | >=2.15.0 | ML inference |
| onnxruntime | >=1.17 | ONNX model inference |
| scikit-learn | >=1.4 | Calibration, ML utilities |
| xgboost | >=2.0 | Gradient boosting (optional) |
| lightgbm | >=4.3 | Gradient boosting (optional) |
| mediapipe | >=0.10.14 | Face detection, landmarks |

### Reporting

| Library | Version | Purpose |
|---------|---------|---------|
| weasyprint | >=61 | HTML to PDF conversion |

### Observability

| Library | Version | Purpose |
|---------|---------|---------|
| prometheus-client | >=0.20 | Metrics export |

### Frontend Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16.3.0 |
| UI Library | React | 19.2.8 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Component Library | Radix UI | Various |
| Charts | Recharts | ^3.10.1 |
| State Management | Zustand | ^5.0.14 |
| Data Fetching | TanStack Query | ^5.101.4 |
| Forms | react-hook-form | ^7.85.0 |
| Validation | Zod | ^4.4.3 |
| Animation | Motion | ^13.1.0 |
| Icons | Lucide React | ^1.31.0 |
| Date Handling | date-fns | ^4.4.0 |
| Notifications | Sonner | ^2.0.8 |

### Development Tools

| Tool | Purpose |
|------|---------|
| ruff | Python linting |
| black | Python formatting |
| mypy | Python type checking |
| pytest | Python testing |
| pytest-asyncio | Async test support |
| ESLint | JavaScript/TypeScript linting |
| Playwright | E2E testing |

---

## Repository Structure

```
Deepfake/
├── backend/                          # FastAPI forensic backend
│   ├── app/
│   │   ├── api/                      # REST routes
│   │   │   ├── analysis.py           # Analysis endpoints
│   │   │   ├── upload.py             # Media upload endpoints
│   │   │   ├── health.py             # Health check endpoints
│   │   │   ├── websocket.py          # WebSocket progress streaming
│   │   │   ├── compat.py             # Frontend-compatible routes
│   │   │   └── router.py             # API router aggregation
│   │   ├── core/                     # Core utilities
│   │   │   ├── logging.py            # Structured logging
│   │   │   ├── security.py           # JWT, password hashing
│   │   │   ├── metrics.py            # Prometheus metrics
│   │   │   ├── exceptions.py         # Custom exceptions
│   │   │   └── middleware.py         # Request middleware
│   │   ├── db/                       # Database layer
│   │   │   ├── database.py           # Async engine, session factory
│   │   │   ├── enums.py              # SQLAlchemy enums
│   │   │   └── base.py               # Base models, mixins
│   │   ├── forensic/                 # Forensic pipeline
│   │   │   ├── pipeline.py           # Main analysis pipeline
│   │   │   ├── signals.py            # Signal result types
│   │   │   ├── interface.py          # Detector interface
│   │   │   ├── verdict_engine.py     # Verdict assessment
│   │   │   ├── evidence_engine.py    # Evidence aggregation
│   │   │   ├── image/                # Image analyzers
│   │   │   │   ├── spatial.py        # Spatial artifact detection
│   │   │   │   ├── frequency.py      # FFT frequency analysis
│   │   │   │   ├── metadata.py       # EXIF/metadata analysis
│   │   │   │   ├── heatmap.py        # Heatmap generation
│   │   │   │   ├── compression.py    # Compression artifact detection
│   │   │   │   └── ai_generated.py   # AI generation detection
│   │   │   ├── video/                # Video analyzers
│   │   │   │   ├── frame_extractor.py
│   │   │   │   ├── temporal.py       # Temporal consistency
│   │   │   │   ├── optical_flow.py   # Optical flow analysis
│   │   │   │   ├── rppg.py           # Remote photoplethysmography
│   │   │   │   ├── av_sync.py        # Audio-visual sync
│   │   │   │   ├── face_detection.py
│   │   │   │   ├── face_tracking.py
│   │   │   │   ├── landmarks.py
│   │   │   │   └── lighting.py       # Lighting consistency
│   │   │   ├── audio/                # Audio analyzers
│   │   │   │   ├── spectrogram.py
│   │   │   │   ├── voice_detector.py
│   │   │   │   └── synthetic_speech.py
│   │   │   ├── fusion/               # Signal fusion
│   │   │   │   ├── calibration.py    # Probability calibration
│   │   │   │   ├── scoring.py        # Score aggregation
│   │   │   │   └── meta_classifier.py
│   │   │   └── media/                # Media utilities
│   │   │       └── quality.py        # Media quality assessment
│   │   ├── ml/                       # ML model handling
│   │   │   ├── model_registry.py     # Model registration
│   │   │   ├── inference.py          # Model inference
│   │   │   ├── adapters.py           # Model adapters
│   │   │   └── microservice_client.py
│   │   ├── schemas/                  # Pydantic schemas
│   │   │   ├── analysis.py
│   │   │   ├── media.py
│   │   │   ├── evidence.py
│   │   │   ├── reports.py
│   │   │   ├── jobs.py
│   │   │   └── common.py
│   │   ├── services/                 # Business services
│   │   │   ├── analysis_service.py
│   │   │   ├── media_service.py
│   │   │   ├── storage_service.py
│   │   │   ├── evidence_service.py
│   │   │   └── report_service.py
│   │   ├── workers/                  # Task workers
│   │   │   ├── executor.py           # Job execution
│   │   │   ├── tasks.py              # Celery tasks
│   │   │   ├── celery_app.py         # Celery configuration
│   │   │   └── progress.py           # Progress publishing
│   │   ├── evaluation/               # Model evaluation
│   │   │   ├── runner.py
│   │   │   ├── scoring.py
│   │   │   ├── dataset.py
│   │   │   └── report.py
│   │   ├── utils/                    # Utilities
│   │   │   ├── files.py
│   │   │   ├── hashing.py
│   │   │   ├── timestamps.py
│   │   │   └── ffmpeg.py
│   │   ├── main.py                   # FastAPI app factory
│   │   ├── config.py                 # Settings/configuration
│   │   └── dependencies.py           # Dependency injection
│   ├── tests/                        # Test suite
│   │   ├── test_api.py
│   │   ├── test_fusion.py
│   │   ├── test_contracts.py
│   │   ├── test_evidence_engine.py
│   │   ├── test_image_detectors.py
│   │   ├── test_synthetic_speech.py
│   │   ├── test_evaluation.py
│   │   ├── test_media_quality.py
│   │   ├── test_registry.py
│   │   └── test_mime.py
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── .env.example
│
├── frontend/                         # Next.js 16 console
│   └── src/
│       ├── app/                      # Next.js App Router
│       │   ├── layout.tsx            # Root layout
│       │   └── (app)/                # Authenticated app routes
│       │       ├── layout.tsx        # App shell layout
│       │       ├── page.tsx          # Dashboard
│       │       ├── analyze/          # Media analysis page
│       │       ├── history/          # Analysis history
│       │       ├── batch/            # Batch analysis
│       │       ├── compare/          # Analysis comparison
│       │       ├── evidence/         # Evidence viewer
│       │       ├── reports/          # Report generation
│       │       ├── settings/         # User settings
│       │       ├── api/              # API key management
│       │       └── analysis/[id]/    # Single analysis view
│       ├── components/
│       │   ├── analysis/             # Analysis components
│       │   │   ├── AnalysisDetailView.tsx
│       │   │   ├── VerdictCard.tsx
│       │   │   ├── SignalBreakdown.tsx
│       │   │   ├── EvidenceTimeline.tsx
│       │   │   ├── ProcessingPipeline.tsx
│       │   │   ├── ConfidenceGauge.tsx
│       │   │   ├── AnalysesTable.tsx
│       │   │   └── ReportView.tsx
│       │   ├── forensic/             # Forensic visualization
│       │   │   ├── HeatmapViewer.tsx
│       │   │   ├── FrequencyChart.tsx
│       │   │   ├── AudioWaveform.tsx
│       │   │   ├── AudioForensics.tsx
│       │   │   ├── VideoTimeline.tsx
│       │   │   ├── FrameInvestigation.tsx
│       │   │   └── MetadataPanel.tsx
│       │   ├── layout/               # Layout components
│       │   │   ├── AppShell.tsx
│       │   │   ├── Header.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── MobileNav.tsx
│       │   │   └── MobileSidebarDrawer.tsx
│       │   ├── dashboard/            # Dashboard widgets
│       │   │   ├── StatCard.tsx
│       │   │   └── ActivityChart.tsx
│       │   ├── upload/               # Upload components
│       │   │   ├── MediaDropzone.tsx
│       │   │   └── MediaPreview.tsx
│       │   ├── common/               # Shared components
│       │   │   ├── badges.tsx
│       │   │   ├── empty-state.tsx
│       │   │   ├── page-header.tsx
│       │   │   └── sparkline.tsx
│       │   ├── ui/                   # shadcn/ui components
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── dropdown-menu.tsx
│       │   │   ├── input.tsx
│       │   │   ├── select.tsx
│       │   │   ├── tabs.tsx
│       │   │   ├── progress.tsx
│       │   │   ├── slider.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── avatar.tsx
│       │   │   ├── checkbox.tsx
│       │   │   ├── switch.tsx
│       │   │   ├── tooltip.tsx
│       │   │   ├── scroll-area.tsx
│       │   │   ├── separator.tsx
│       │   │   ├── table.tsx
│       │   │   ├── label.tsx
│       │   │   ├── skeleton.tsx
│       │   │   └── drawer.tsx
│       │   └── providers.tsx         # React Query provider
│       ├── hooks/                    # Custom hooks
│       │   ├── useAnalysis.ts
│       │   ├── useAnalysisProgress.ts
│       │   └── useMediaPlayer.ts
│       ├── lib/                      # Utilities
│       │   ├── api.ts                # API client
│       │   ├── utils.ts              # Utility functions
│       │   ├── constants.ts          # App constants
│       │   └── validators.ts         # Form validators
│       ├── mocks/                    # Mock data for offline mode
│       │   ├── analyses.ts
│       │   ├── evidence.ts
│       │   ├── registry.ts
│       │   └── resultFactory.ts
│       ├── store/                    # Zustand stores
│       │   ├── analysisStore.ts
│       │   └── uiStore.ts
│       └── types/                    # TypeScript types
│           ├── analysis.ts
│           ├── media.ts
│           └── evidence.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── audio_ml/                         # Audio ML microservice
│   ├── app/
│   │   ├── main.py                   # FastAPI app
│   │   ├── detectors.py              # Audio detectors
│   │   └── external_api.py
│   └── requirements.txt
│
├── image_ml/                         # Image ML microservice
│   ├── app/
│   │   ├── main.py                   # FastAPI app
│   │   ├── detectors.py              # Image detectors
│   │   └── external_api.py
│   └── requirements.txt
│
├── video_ml/                         # Video ML microservice
│   ├── app/
│   │   ├── main.py                   # FastAPI app
│   │   ├── detectors.py              # Video detectors
│   │   └── external_api.py
│   └── requirements.txt
│
└── README.md
```


---

## Backend Details

### Main Application Entry Point

**File:** `backend/app/main.py`

The FastAPI application is created via a factory pattern with the following setup:

```python
# Key middleware stack (in order):
1. AnalysisContextMiddleware    # Analysis ID context tracking
2. ExceptionHandlerMiddleware   # Global exception handling
3. RequestContextMiddleware     # Request ID tracking
4. CORSMiddleware              # CORS handling

# Lifespan management:
- Startup: Initialize database connection
- Shutdown: Dispose database engine

# Routes:
- /                          # Root info endpoint
- /metrics                   # Prometheus metrics
- /docs                      # Swagger UI
- /redoc                     # ReDoc documentation
- /api/v1/*                  # Versioned API routes
- /*                         # Compatibility routes for frontend
```

### Configuration System

**File:** `backend/app/config.py`

Configuration is managed via Pydantic Settings with environment variable support:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `app_name` | str | AUTHENTIQ | Application name |
| `app_env` | Literal | development | Environment (development/staging/production) |
| `api_prefix` | str | /api/v1 | API version prefix |
| `debug` | bool | True | Debug mode |

#### Database Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `database_url` | postgresql+asyncpg://... | Async database URL |
| `db_echo` | False | SQL echo for debugging |
| `db_pool_size` | 10 | Connection pool size |
| `db_max_overflow` | 20 | Max overflow connections |

#### Redis/Celery Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `redis_url` | redis://localhost:6379/0 | Redis connection URL |
| `celery_broker_url` | redis://localhost:6379/0 | Celery broker |
| `celery_result_backend` | redis://localhost:6379/1 | Result backend |
| `use_in_process_tasks` | True | Run tasks in-process (no Celery) |
| `task_timeout_seconds` | 600 | Task timeout |

#### Storage Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `storage_type` | local | Storage backend (local/s3) |
| `storage_path` | ./storage | Local storage path |
| `s3_bucket` | authentiq | S3 bucket name |
| `s3_region` | us-east-1 | S3 region |
| `public_base_url` | http://localhost:8000 | Public URL for artifacts |

#### Upload Limits

| Setting | Default | Description |
|---------|---------|-------------|
| `max_upload_size_mb` | 500 | Max upload size in MB |
| `max_video_duration_seconds` | 1800 | Max video duration (30 min) |
| `max_audio_duration_seconds` | 1800 | Max audio duration (30 min) |

#### ML Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `model_device` | cpu | Device for inference (cpu/cuda/mps) |
| `use_mock_models` | True | Use mock models for demo |
| `model_cache_dir` | ./models | Model cache directory |
| `image_ml_url` | None | Image ML microservice URL |
| `audio_ml_url` | None | Audio ML microservice URL |
| `video_ml_url` | None | Video ML microservice URL |

#### Pipeline Tuning

| Setting | Default | Description |
|---------|---------|-------------|
| `sample_fps` | 2.0 | Frame sampling rate |
| `max_frames` | 240 | Max frames to extract |
| `heatmap_alpha` | 0.45 | Heatmap overlay opacity |
| `enable_rppg` | True | Enable rPPG analysis |
| `rppg_min_signal_quality` | 0.4 | Min rPPG signal quality |

#### Security Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `jwt_secret_key` | change-me-in-production | JWT signing key |
| `jwt_algorithm` | HS256 | JWT algorithm |
| `jwt_access_ttl_minutes` | 30 | Access token TTL |
| `jwt_refresh_ttl_days` | 7 | Refresh token TTL |
| `password_hash_rounds` | 12 | bcrypt rounds |
| `api_key_ttl_days` | 365 | API key TTL |
| `idempotency_ttl_seconds` | 3600 | Idempotency key TTL |

#### Rate Limiting

| Setting | Default | Description |
|---------|---------|-------------|
| `rate_limit_anonymous` | 10/hour | Anonymous user limit |
| `rate_limit_authenticated` | 100/hour | Authenticated user limit |
| `rate_limit_api` | 500/hour | API key limit |

#### Verdict Thresholds

| Setting | Default | Description |
|---------|---------|-------------|
| `verdict_authentic_max` | 0.30 | Max probability for "authentic" |
| `verdict_inconclusive_max` | 0.60 | Max probability for "inconclusive" |
| `verdict_suspicious_max` | 0.80 | Max probability for "suspicious" |

### Database Models

**Directory:** `backend/app/db/`

#### Enums

```python
class MediaType(str, Enum):
    image = "image"
    video = "video"
    audio = "audio"

class AnalysisStatus(str, Enum):
    created = "CREATED"
    uploading = "UPLOADING"
    queued = "QUEUED"
    processing = "PROCESSING"
    fusing = "FUSING"
    calibrating = "CALIBRATING"
    completed = "COMPLETED"
    failed = "FAILED"
    cancelled = "CANCELLED"

class Verdict(str, Enum):
    authentic = "authentic"
    inconclusive = "inconclusive"
    suspicious = "suspicious"
    manipulated = "manipulated"

class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class SignalType(str, Enum):
    spatial = "spatial"
    frequency = "frequency"
    temporal = "temporal"
    physiological = "physiological"
    av_sync = "av-sync"
    metadata = "metadata"
    voice_spectral = "voice-spectral"
    compression = "compression"
    ai_generated = "ai-generated"
    lighting = "lighting"
    face_tracking = "face-tracking"
    speech_synthetic = "speech-synthetic"
```

#### Base Models

```python
class TimestampMixin:
    created_at: datetime
    updated_at: datetime

class UUIDPrimaryKeyMixin:
    id: str  # UUID as string
```

### Forensic Pipeline

**File:** `backend/app/forensic/pipeline.py`

The main `AnalysisPipeline` class orchestrates the entire forensic analysis:

#### Pipeline Stages

1. **VALIDATION** (2%) - Media integrity validation
2. **SPATIAL_ANALYSIS** (20-62%) - Spatial artifact detection
3. **COMPRESSION_ANALYSIS** (33%) - Compression artifact detection
4. **AI_GENERATED_ANALYSIS** (40%) - AI generation detection
5. **FREQUENCY_ANALYSIS** (50-58%) - FFT frequency analysis
6. **HEATMAP** (62%) - Heatmap generation
7. **METADATA_ANALYSIS** (78-80%) - EXIF/metadata inspection
8. **TEMPORAL_ANALYSIS** (66%) - Temporal consistency (video)
9. **AUDIO_ANALYSIS** (74%) - Audio track analysis (video)
10. **AV_SYNC** (86%) - Audio-visual sync (video)
11. **RPPG** (88%) - Physiological signals (video)
12. **LIGHTING_ANALYSIS** (90%) - Lighting consistency (video)
13. **FACE_TRACKING** (92%) - Face identity tracking (video)
14. **EVIDENCE_FUSION** (90-95%) - Signal fusion
15. **CALIBRATION** (98%) - Probability calibration

#### PipelineOutcome Dataclass

```python
@dataclass
class PipelineOutcome:
    signals: list[SignalResult]
    evidence: list[dict]
    suspicious_frames: list[dict]
    suspicious_segments: list[dict]
    frequency_data: list[dict]
    heatmap_regions: list[dict]
    metadata_record: dict
    audio_analysis: dict | None
    artifacts: dict[str, str | None]
    fused_probability: float | None
    calibrated: dict
    verdict: str | None
    explanation: str
    models: dict[str, str]
    duration_ms: int
    media_details: dict
    media_quality: dict | None
    cross_modal: dict | None
    engine_version: str | None
    uncertainty: float | None
    agreement_score: float | None
```

### Signal Detectors

#### Image Detectors

| Detector | File | Purpose |
|----------|------|---------|
| SpatialAnalyzer | `image/spatial.py` | Detect spatial texture artifacts |
| FFTSpatialFrequencyAnalyzer | `image/frequency.py` | FFT-based frequency analysis |
| CompressionAnalyzer | `image/compression.py` | JPEG/HEVC compression artifacts |
| AIGeneratedAbstractionAnalyzer | `image/ai_generated.py` | AI generation fingerprints |
| MetadataDetector | `image/metadata.py` | EXIF/C2PA metadata analysis |
| HeatmapGenerator | `image/heatmap.py` | Generate explainability heatmaps |

#### Video Detectors

| Detector | File | Purpose |
|----------|------|---------|
| FrameExtractor | `video/frame_extractor.py` | Extract frames from video |
| TemporalAnalyzer | `video/temporal.py` | Temporal consistency analysis |
| OpticalFlowAnalyzer | `video/optical_flow.py` | Optical flow discontinuities |
| RPPGDetector | `video/rppg.py` | Remote photoplethysmography |
| AVSyncDetector | `video/av_sync.py` | Audio-visual synchronization |
| FaceDetector | `video/face_detection.py` | Face detection in frames |
| FaceTrackingAnalyzer | `video/face_tracking.py` | Face identity tracking |
| LandmarkDetector | `video/landmarks.py` | Facial landmark detection |
| LightingConsistencyAnalyzer | `video/lighting.py` | Lighting consistency |

#### Audio Detectors

| Detector | File | Purpose |
|----------|------|---------|
| SpectrogramAnalyzer | `audio/spectrogram.py` | Spectrogram generation |
| VoiceDetector | `audio/voice_detector.py` | Voice detection |
| SyntheticSpeechAbstractionAnalyzer | `audio/synthetic_speech.py` | Synthetic speech detection |

### Signal Fusion

**Directory:** `backend/app/forensic/fusion/`

#### Calibration (`calibration.py`)

Three calibrator types are available:

```python
class IdentityCalibrator:
    # No-op calibration (passthrough)

class PlattCalibrator:
    # Sigmoid scaling: 1 / (1 + exp(-(a*x + b)))

class IsotonicCalibrator:
    # Isotonic regression via sklearn
```

#### Meta Classifier (`meta_classifier.py`)

Combines individual signal scores into a fused probability:

- Weighted ensemble approach
- XGBoost/LightGBM when available
- Agreement-aware prediction with uncertainty

#### Verdict Engine (`verdict_engine.py`)

Maps calibrated probability to verdict:

```python
# Threshold-based verdict mapping:
p <= 0.30 → authentic
p <= 0.60 → inconclusive
p <= 0.80 → suspicious
p > 0.80  → manipulated

# Uncertainty-aware widening:
# High uncertainty expands inconclusive band
```

### Model Registry

**File:** `backend/app/ml/model_registry.py`

Central registry for ML model metadata:

#### Registered Models

| Model Name | Version | Framework | Family |
|------------|---------|-----------|--------|
| spatial-detector-v1 | 1.0.0 | tensorflow/mock | image-spatial |
| frequency-detector-v1 | 1.0.0 | signal-processing | image-frequency |
| temporal-detector-v1 | 1.0.0 | signal-processing | video-temporal |
| audio-detector-v1 | 1.0.0 | signal-processing | audio-voice |
| metadata-detector-v1 | 1.0.0 | rule-based | provenance |
| fusion-model-v1 | 1.0.0 | ensemble | fusion |
| rppg-detector-v1 | 1.0.0 | signal-processing | video-physiological |
| av-sync-detector-v1 | 1.0.0 | signal-processing | video-av-sync |
| compression-detector-v1 | 1.0.0 | signal-processing | image-compression |
| ai-generated-detector-v1 | 1.0.0 | signal-processing | image-abstraction |
| lighting-detector-v1 | 1.0.0 | signal-processing | video-lighting |
| face-tracking-detector-v1 | 1.0.0 | signal-processing | video-face |
| speech-synthetic-detector-v1 | 1.0.0 | signal-processing | audio-abstraction |

#### ModelSpec Dataclass

```python
@dataclass
class ModelSpec:
    name: str
    version: str
    framework: str
    path: str | None
    checksum: str | None
    input_size: tuple[int, int] | None
    device: str
    is_mock: bool
    family: str
    task: str
    backbone: str
    release_date: str
    license: str
    supported_modalities: list[str]
    memory_mb: int | None
    input_format: str
    output_spec: str
    description: str
    paper_url: str | None
    benchmark_accuracy: float | None
```

### Services Layer

#### AnalysisService (`services/analysis_service.py`)

- CRUD operations for analyses
- Status transitions
- Progress recording
- Pipeline result persistence

#### MediaService (`services/media_service.py`)

- Media file loading
- Media validation
- Fingerprinting (SHA-256)

#### StorageService (`services/storage_service.py`)

Supports two backends:

```python
class LocalStorage:
    # Filesystem-backed storage
    # Root directory: STORAGE_PATH

class S3Storage:
    # S3-compatible object storage
    # Uses boto3
```

#### EvidenceService (`services/evidence_service.py`)

- Evidence artifact management
- Evidence linking to analyses

#### ReportService (`services/report_service.py`)

- HTML report generation
- PDF report generation via WeasyPrint

### Workers

**Directory:** `backend/app/workers/`

#### Task Execution (`executor.py`)

```python
async def run_analysis_job(analysis_id: str) -> dict:
    # 1. Load analysis from database
    # 2. Ensure job record exists
    # 3. Mark job as started
    # 4. Transition analysis to PROCESSING
    # 5. Load media file
    # 6. Run forensic pipeline
    # 7. Save results
    # 8. Finalize analysis
    # 9. Publish completion
```

#### Celery Integration (`celery_app.py`)

- Celery app configuration
- Redis broker setup
- Task registration

#### Progress Publishing (`progress.py`)

- WebSocket progress events
- Progress persistence


---

## Frontend Details

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16.3.0 (App Router) |
| UI Library | React | 19.2.8 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Charts | Recharts | ^3.10.1 |
| State | Zustand | ^5.0.14 |
| Data Fetching | TanStack Query | ^5.101.4 |

### App Router Structure

```
app/
├── layout.tsx                 # Root layout with providers
└── (app)/                     # Authenticated route group
    ├── layout.tsx             # App shell (sidebar, header)
    ├── page.tsx               # Dashboard
    ├── analyze/page.tsx       # Media upload & analysis
    ├── history/page.tsx       # Analysis history
    ├── batch/page.tsx         # Batch analysis
    ├── compare/page.tsx       # Compare analyses
    ├── evidence/page.tsx      # Evidence viewer
    ├── reports/page.tsx       # Report management
    ├── settings/page.tsx      # User settings
    ├── api/page.tsx           # API key management
    └── analysis/[id]/        # Single analysis routes
        ├── page.tsx           # Analysis detail view
        └── report/page.tsx    # Report view
```

### TypeScript Types

#### Analysis Types (`types/analysis.ts`)

```typescript
type Verdict = "authentic" | "suspicious" | "manipulated" | "inconclusive";
type Severity = "low" | "medium" | "high";

type SignalId =
  | "spatial"
  | "frequency"
  | "temporal"
  | "physiological"
  | "av-sync"
  | "metadata"
  | "voice-spectral"
  | "compression"
  | "ai-generated"
  | "lighting"
  | "face-tracking"
  | "speech-synthetic";

interface AnalysisResult {
  id: string;
  mediaType: MediaType;
  filename: string;
  previewUrl?: string;
  verdict: Verdict;
  confidence: number;
  confidenceInterval?: { lower: number; upper: number };
  explanation: string;
  signals: SignalResult[];
  suspiciousFrames?: SuspiciousFrame[];
  frequencyData?: FrequencyPoint[];
  heatmapRegions?: HeatmapRegion[];
  timeline?: TimelineEvent[];
  metadata?: MediaMetadata;
  audioAnalysis?: AudioAnalysisResult;
  processingTime?: number;
  status: AnalysisStatus;
  createdAt: string;
}

interface SignalResult {
  id: SignalId;
  name: string;
  score: number;
  confidence: number;
  severity: Severity;
  explanation: string;
  technical?: string[];
  evidence?: Evidence[];
  limitations?: string[];
  supportingDetails?: string[];
}
```

#### Media Types (`types/media.ts`)

```typescript
type MediaType = "image" | "video" | "audio";
type AnalysisStatus = "queued" | "processing" | "complete" | "failed" | "review";

interface MediaFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  type: MediaType;
  duration?: number;
  dimensions?: { width: number; height: number };
  previewUrl?: string;
}

const ACCEPTED_MEDIA_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".webp",
  ".mp4", ".mov", ".avi",
  ".mp3", ".wav", ".m4a"
];

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
```

### API Client (`lib/api.ts`)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export const api = {
  async getAnalysis(id: string): Promise<AnalysisResult>,
  async getHistory(): Promise<AnalysisResult[]>,
  async analyzeMedia(mediaType, file, signals): Promise<{ id: string }>,
  async getAnalysisProgress(id: string): Promise<AnalysisProgressEvent[]>,
  async getBatchHistory(): Promise<AnalysisResult[]>,
};
```

### State Management (`store/analysisStore.ts`)

Zustand store for analysis state:

```typescript
interface AnalysisState {
  currentFile: MediaFile | null;
  currentResult: AnalysisResult | null;
  batchFiles: MediaFile[];
  pendingEntries: PendingEntry[];
  
  // Actions
  setCurrentFile: (file: MediaFile | null) => void;
  setCurrentResult: (result: AnalysisResult | null) => void;
  setPendingEntries: (entries: PendingEntry[]) => void;
  addBatchFile: (file: MediaFile) => void;
  removeBatchFile: (id: string) => void;
  clearBatch: () => void;
}
```

### Custom Hooks (`hooks/`)

| Hook | Purpose |
|------|---------|
| `useAnalysis(id)` | Fetch and cache analysis result |
| `useHistory()` | Fetch analysis history |
| `useStartAnalysis()` | Mutation to start analysis |
| `useAnalysisProgress(id)` | WebSocket progress tracking |
| `useMediaPlayer(blob)` | Object URL management |
| `useGenerateBatchResult()` | Batch result generation |

### Key Components

#### Analysis Components

| Component | Purpose |
|-----------|---------|
| `AnalysisDetailView` | Full analysis presentation |
| `VerdictCard` | Verdict display with confidence |
| `SignalBreakdown` | Per-signal score cards |
| `EvidenceTimeline` | Timeline of evidence events |
| `ProcessingPipeline` | Progress indicator |
| `ConfidenceGauge` | Gauge chart for confidence |
| `AnalysesTable` | Data table for history |
| `ReportView` | Report rendering |

#### Forensic Components

| Component | Purpose |
|-----------|---------|
| `HeatmapViewer` | Heatmap overlay visualization |
| `FrequencyChart` | FFT frequency chart |
| `AudioWaveform` | Audio waveform display |
| `AudioForensics` | Audio analysis summary |
| `VideoTimeline` | Video timeline with markers |
| `FrameInvestigation` | Suspicious frame viewer |
| `MetadataPanel` | EXIF/metadata display |

#### Layout Components

| Component | Purpose |
|-----------|---------|
| `AppShell` | Main app layout wrapper |
| `Header` | Top navigation bar |
| `Sidebar` | Side navigation menu |
| `MobileNav` | Mobile navigation |
| `MobileSidebarDrawer` | Mobile sidebar drawer |

#### Upload Components

| Component | Purpose |
|-----------|---------|
| `MediaDropzone` | Drag-and-drop upload |
| `MediaPreview` | Media preview display |

### Mock Data (`mocks/`)

Offline demo mode provides deterministic mock data:

| Module | Purpose |
|--------|---------|
| `analyses.ts` | Mock analysis results |
| `evidence.ts` | Mock evidence artifacts |
| `registry.ts` | Analysis ID registry |
| `resultFactory.ts` | Result generation factory |

### Pages Overview

#### Dashboard (`page.tsx`)

- Statistics cards (total analyses, verdict distribution)
- Activity chart (Recharts)
- Recent analyses table

#### Analyze Page (`analyze/page.tsx`)

- Media dropzone
- Signal selection
- Upload progress
- Real-time analysis progress

#### History Page (`history/page.tsx`)

- Paginated analysis history
- Filters by verdict, media type, date
- Search functionality
- Export capabilities

#### Batch Page (`batch/page.tsx`)

- Multi-file upload
- Batch progress tracking
- Aggregate results

#### Compare Page (`compare/page.tsx`)

- Side-by-side analysis comparison
- Signal difference highlighting

#### Evidence Page (`evidence/page.tsx`)

- Evidence artifact viewer
- Heatmap, spectrogram, frequency displays
- Download functionality

#### Reports Page (`reports/page.tsx`)

- Report generation
- PDF download
- Report history

#### Settings Page (`settings/page.tsx`)

- User preferences
- Notification settings
- Theme selection

#### API Keys Page (`api/page.tsx`)

- API key management
- Create, view, revoke keys
- Usage statistics

---

## ML Microservices

Three standalone ML microservices for horizontal scaling and deployment flexibility.

### Image ML Service (`image_ml/`)

**Port:** 8001 (default)

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/analyze/image` | Image analysis |

#### Request Format

```json
// File upload
POST /analyze/image
Content-Type: multipart/form-data
file: <binary>

// URL-based
POST /analyze/image
Content-Type: application/json
{"url": "https://..."}
```

#### Response Format

```json
{
  "media_type": "image",
  "fused_probability": 0.45,
  "signals": {
    "spatial": {"score": 0.5, "explanation": "..."},
    "frequency": {"score": 0.4, "explanation": "..."},
    "compression": {"score": 0.35, "explanation": "..."}
  },
  "regions": [
    {"x": 100, "y": 150, "width": 50, "height": 50, "intensity": 0.8}
  ]
}
```

#### Dependencies

```
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
httpx>=0.27.0
numpy>=1.26.0
pillow>=10.2.0
opencv-python-headless>=4.9.0
tensorflow-cpu>=2.15.0
onnxruntime>=1.17.0
scipy>=1.12.0
```

### Audio ML Service (`audio_ml/`)

**Port:** 8002 (default)

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/analyze/audio` | Audio analysis |

#### Response Format

```json
{
  "media_type": "audio",
  "fused_probability": 0.55,
  "signals": {
    "voice_spectral": {
      "score": 0.55,
      "spectral_score": 0.5,
      "prosody_score": 0.6,
      "vocoder_artifacts": 0.4,
      "explanation": "..."
    }
  }
}
```

#### Dependencies

```
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
httpx>=0.27.0
numpy>=1.26.0
scipy>=1.12.0
tensorflow-cpu>=2.15.0
onnxruntime>=1.17.0
```

### Video ML Service (`video_ml/`)

**Port:** 8003 (default)

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/analyze/video` | Video analysis |

#### Response Format

```json
{
  "media_type": "video",
  "fused_probability": 0.48,
  "signals": {
    "temporal": {"score": 0.45, "segments": [...]},
    "rppg": {"score": 0.5, "heart_rate": 72}
  },
  "suspicious_frames": [
    {"frame_number": 45, "timestamp": 1.5, "score": 0.75}
  ]
}
```

#### Dependencies

```
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
httpx>=0.27.0
numpy>=1.26.0
pillow>=10.2.0
opencv-python-headless>=4.9.0
scipy>=1.12.0
tensorflow-cpu>=2.15.0
onnxruntime>=1.17.0
```

### Microservice Architecture

```
┌──────────────────┐      ┌──────────────────┐
│   Main Backend   │      │   Image ML      │
│   (FastAPI)      │─────►│   (Port 8001)   │
│                  │      └──────────────────┘
│                  │      ┌──────────────────┐
│                  │─────►│   Audio ML      │
│                  │      │   (Port 8002)   │
│                  │      └──────────────────┘
│                  │      ┌──────────────────┐
│                  │─────►│   Video ML      │
│                  │      │   (Port 8003)   │
└──────────────────┘      └──────────────────┘
```

Configuration via environment variables:
- `IMAGE_ML_URL` - Image microservice URL
- `AUDIO_ML_URL` - Audio microservice URL
- `VIDEO_ML_URL` - Video microservice URL


---

## API Reference

All versioned routes are prefixed with `/api/v1`. Unprefixed "compat" routes mirror the same API for frontend consumption.

### Analysis Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/analyze/{media_type}` | Upload & analyze media |
| POST | `/api/v1/analyze/{media_type}/metadata` | Create analysis from metadata |
| GET | `/api/v1/analysis/history` | List recent analyses |
| GET | `/api/v1/analysis/batch` | Latest batch summaries |
| POST | `/api/v1/analysis/batch` | Run analyses for pending uploads |
| GET | `/api/v1/analysis/{id}` | Full analysis result |
| GET | `/api/v1/analysis/{id}/progress` | Progress events |
| GET | `/api/v1/analysis/{id}/evidence` | Evidence artifacts |
| GET | `/api/v1/analysis/{id}/report` | HTML forensic report |
| GET | `/api/v1/analysis/{id}/report/pdf` | PDF forensic report |
| DELETE | `/api/v1/analysis/{id}` | Delete an analysis |

### Authentication Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create user |
| POST | `/api/v1/auth/login` | JWT login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/api-keys` | Issue an API key |
| GET | `/api/v1/auth/api-keys` | List API keys |
| DELETE | `/api/v1/auth/api-keys/{key_id}` | Revoke API key |
| POST | `/api/v1/auth/api-keys/{key_id}/rotate` | Rotate API key |

### System Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Root info |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/v1/health` | Health check + metrics |

### WebSocket Endpoints

| Path | Description |
|------|-------------|
| `/api/v1/ws/analysis/{job_id}` | Live analysis progress stream |

### Request/Response Formats

#### Upload & Analyze

```http
POST /api/v1/analyze/image
Content-Type: multipart/form-data

file: <binary>
signals: ["spatial", "frequency", "metadata"]
```

**Response:**
```json
{
  "id": "IMG-2026-00123",
  "mediaType": "image",
  "filename": "photo.jpg",
  "status": "queued",
  "createdAt": "2026-08-12T15:30:00Z"
}
```

#### Analysis Result

```json
{
  "id": "IMG-2026-00123",
  "mediaType": "image",
  "filename": "photo.jpg",
  "previewUrl": "/media/uploads/abc123.jpg",
  "verdict": "suspicious",
  "confidence": 0.68,
  "confidenceInterval": {
    "lower": 0.55,
    "upper": 0.78
  },
  "explanation": "Multiple signals indicate likely manipulation...",
  "signals": [
    {
      "id": "spatial",
      "name": "Spatial Analysis",
      "score": 0.72,
      "confidence": 0.75,
      "severity": "high",
      "explanation": "Blend artifacts detected in facial region",
      "limitations": ["Low-quality input may reduce reliability"]
    }
  ],
  "suspiciousFrames": [],
  "frequencyData": [...],
  "heatmapRegions": [...],
  "processingTime": 4.2,
  "status": "complete",
  "createdAt": "2026-08-12T15:30:00Z"
}
```

#### Progress Events

```json
[
  {
    "step": "Media ingestion",
    "status": "done",
    "progress": 10,
    "detail": "File uploaded successfully"
  },
  {
    "step": "Spatial artifact analysis",
    "status": "active",
    "progress": 35,
    "detail": "Analyzing texture patterns"
  }
]
```

### Error Responses

```json
{
  "error": {
    "code": "ANALYSIS_NOT_FOUND",
    "message": "Analysis with ID 'invalid-id' not found",
    "details": {}
  }
}
```

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| ANALYSIS_NOT_FOUND | 404 | Analysis ID doesn't exist |
| INVALID_MEDIA | 400 | Media file is invalid |
| FILE_TOO_LARGE | 413 | File exceeds size limit |
| UNSUPPORTED_FORMAT | 415 | Media format not supported |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit hit |
| UNAUTHORIZED | 401 | Missing/invalid auth |
| FORBIDDEN | 403 | Insufficient permissions |

---

## Database Schema

### Core Tables

#### `analyses`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| media_type | VARCHAR(16) | image/video/audio |
| status | VARCHAR(16) | CREATED/QUEUED/PROCESSING/etc. |
| verdict | VARCHAR(16) | authentic/suspicious/etc. |
| confidence | FLOAT | Calibrated confidence score |
| explanation | TEXT | Plain-language explanation |
| media_id | VARCHAR(36) | FK to media table |
| owner_id | VARCHAR(36) | FK to users table |
| media_hash | VARCHAR(64) | SHA-256 fingerprint |
| model_set | VARCHAR(64) | Model set identifier |
| idempotency_key | VARCHAR(64) | Idempotency key |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |
| completed_at | TIMESTAMP | Completion timestamp |
| processing_time_ms | INTEGER | Processing duration |
| media_quality_json | TEXT | Quality assessment JSON |
| cross_modal_json | TEXT | Cross-modal analysis JSON |
| uncertainty | FLOAT | Uncertainty score |
| agreement_score | FLOAT | Signal agreement score |
| engine_version | VARCHAR(32) | Analysis engine version |

#### `media`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| original_filename | VARCHAR(255) | Original filename |
| stored_path | VARCHAR(512) | Storage path/key |
| mime_type | VARCHAR(64) | MIME type |
| size_bytes | BIGINT | File size |
| sha256 | VARCHAR(64) | SHA-256 hash |
| width | INTEGER | Image/video width |
| height | INTEGER | Image/video height |
| duration_seconds | FLOAT | Video/audio duration |
| codec | VARCHAR(32) | Media codec |
| storage_type | VARCHAR(16) | local/s3 |
| created_at | TIMESTAMP | Upload timestamp |

#### `signal_results`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| analysis_id | VARCHAR(36) | FK to analyses |
| signal_type | VARCHAR(32) | Signal identifier |
| score | FLOAT | Signal score (0-1) |
| confidence | FLOAT | Confidence level |
| severity | VARCHAR(16) | low/medium/high |
| status | VARCHAR(16) | available/insufficient_evidence/error |
| explanation | TEXT | Signal explanation |
| model_version | VARCHAR(64) | Model version used |
| detector_name | VARCHAR(64) | Detector name |
| details | TEXT | JSON details |
| evidence | TEXT | JSON evidence array |
| limitations | TEXT | JSON limitations array |
| supporting_details | TEXT | JSON supporting details |

#### `analysis_jobs`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| analysis_id | VARCHAR(36) | FK to analyses |
| task_name | VARCHAR(64) | Task identifier |
| queue | VARCHAR(32) | Queue name |
| status | VARCHAR(16) | pending/running/succeeded/failed |
| attempts | INTEGER | Retry count |
| started_at | TIMESTAMP | Start timestamp |
| finished_at | TIMESTAMP | Completion timestamp |
| error_message | TEXT | Error if failed |

#### `progress_events`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| analysis_id | VARCHAR(36) | FK to analyses |
| stage | VARCHAR(64) | Pipeline stage |
| progress_pct | INTEGER | Progress percentage |
| message | TEXT | Status message |
| created_at | TIMESTAMP | Event timestamp |

#### `users`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| email | VARCHAR(255) | Email (unique) |
| password_hash | VARCHAR(128) | bcrypt hash |
| role | VARCHAR(16) | USER/ADMIN/ANALYST |
| created_at | TIMESTAMP | Creation timestamp |

#### `api_keys`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| user_id | VARCHAR(36) | FK to users |
| key_hash | VARCHAR(128) | Hashed API key |
| prefix | VARCHAR(8) | Key prefix for identification |
| name | VARCHAR(64) | Key name |
| tier | VARCHAR(16) | free/pro/enterprise |
| is_active | BOOLEAN | Active status |
| expires_at | TIMESTAMP | Expiration |
| created_at | TIMESTAMP | Creation timestamp |

### Indexes

```sql
-- Analyses
CREATE INDEX idx_analyses_owner ON analyses(owner_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_media_hash ON analyses(media_hash);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);

-- Signal results
CREATE INDEX idx_signal_results_analysis ON signal_results(analysis_id);

-- Media
CREATE INDEX idx_media_sha256 ON media(sha256);

-- Jobs
CREATE INDEX idx_jobs_analysis ON analysis_jobs(analysis_id);
CREATE INDEX idx_jobs_status ON analysis_jobs(status);
```

---

## Configuration

### Backend Environment Variables

Copy `.env.example` to `.env`:

```bash
cd backend && cp .env.example .env
```

#### Core Settings

```bash
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/authentiq
```

#### Task Processing

```bash
USE_IN_PROCESS_TASKS=true    # No Celery/Redis needed
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

#### Storage

```bash
STORAGE_TYPE=local
STORAGE_PATH=./storage
PUBLIC_BASE_URL=http://localhost:8000

# For S3:
# STORAGE_TYPE=s3
# S3_BUCKET=authentiq
# S3_REGION=us-east-1
# S3_ACCESS_KEY=xxx
# S3_SECRET_KEY=xxx
```

#### ML Settings

```bash
MODEL_DEVICE=cpu
USE_MOCK_MODELS=true
MODEL_CACHE_DIR=./models

# Microservices (optional):
# IMAGE_ML_URL=http://localhost:8001
# AUDIO_ML_URL=http://localhost:8002
# VIDEO_ML_URL=http://localhost:8003
```

#### Security

```bash
JWT_SECRET_KEY=change-me-in-production
JWT_ACCESS_TTL_MINUTES=30
JWT_REFRESH_TTL_DAYS=7
```

#### Rate Limits

```bash
RATE_LIMIT_ANONYMOUS=10/hour
RATE_LIMIT_AUTHENTICATED=100/hour
RATE_LIMIT_API=500/hour
```

#### Verdict Thresholds

```bash
VERDICT_AUTHENTIC_MAX=0.30
VERDICT_INCONCLUSIVE_MAX=0.60
VERDICT_SUSPICIOUS_MAX=0.80
```

### Frontend Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false    # Set to "false" to use real API
```

---

## Forensic Pipeline

### Signal Types

| Signal | Media Types | What It Detects |
|--------|-------------|-----------------|
| spatial | image, video | Blend/compression texture artifacts |
| frequency | image, video, audio | Spectral anomalies |
| temporal | video | Frame-to-frame consistency |
| av-sync | video | Audio-visual synchronization |
| physiological | video | rPPG heart-rate anomalies |
| voice-spectral | audio, video | Spectral voice consistency |
| metadata | all | EXIF/C2PA provenance |
| compression | image | JPEG/HEVC blocking artifacts |
| ai-generated | image | Diffusion model fingerprints |
| lighting | video | Illumination consistency |
| face-tracking | video | Identity continuity |
| speech-synthetic | audio | Synthetic speech detection |

### Fusion Process

1. **Signal Collection**: Each detector produces a `SignalResult`
2. **Quality Adjustment**: Confidence adjusted for media quality
3. **Consensus Building**: `build_consensus()` computes agreement
4. **Meta Classification**: Weighted ensemble or learned classifier
5. **Uncertainty Estimation**: Based on signal disagreement
6. **Calibration**: Platt/isotonic calibration applied
7. **Verdict Mapping**: Threshold-based verdict assignment

### Verdict Thresholds

```
Probability Range    Verdict
─────────────────────────────
0.00 - 0.30         authentic
0.30 - 0.60         inconclusive
0.60 - 0.80         suspicious
0.80 - 1.00         manipulated
```

High uncertainty widens the inconclusive band to avoid overconfident claims.

### Evidence Artifacts

| Artifact | Format | Purpose |
|----------|--------|---------|
| Heatmap | PNG | Spatial activation overlay |
| Frequency Spectrum | PNG/SVG | FFT magnitude plot |
| Spectrogram | PNG | Audio time-frequency display |
| Suspicious Frames | PNG | Flagged video frames |
| Report | HTML/PDF | Forensic summary |

---

## Deployment

### Quick Start (Zero Infrastructure)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

DATABASE_URL=sqlite+aiosqlite:///./dev.db \
USE_IN_PROCESS_TASKS=true \
USE_MOCK_MODELS=true \
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Production Setup

#### Backend

1. **Database**: PostgreSQL with asyncpg
2. **Cache/Broker**: Redis for Celery
3. **Storage**: S3 or local with CDN
4. **Workers**: Celery workers

```bash
# Start backend
uvicorn app.main:app --workers 4 --port 8000

# Start Celery worker
celery -A app.workers.celery_app.celery_app worker -l info
```

#### Frontend

```bash
npm run build
npm start
```

### ML Microservices

Deploy each microservice independently:

```bash
# Image ML
cd image_ml
uvicorn app.main:app --port 8001

# Audio ML
cd audio_ml
uvicorn app.main:app --port 8002

# Video ML
cd video_ml
uvicorn app.main:app --port 8003
```

### Docker (Conceptual)

```dockerfile
# Backend Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Health Checks

- Backend: `GET /api/v1/health`
- Microservices: `GET /health`
- Metrics: `GET /metrics`

---

## Testing

### Backend Tests

```bash
cd backend
pytest                           # Run all tests
pytest -v --cov=app              # With coverage
pytest tests/test_api.py        # Specific test file
```

Test files:
- `test_api.py` - API endpoint tests
- `test_fusion.py` - Signal fusion tests
- `test_contracts.py` - Schema contract tests
- `test_evidence_engine.py` - Evidence tests
- `test_image_detectors.py` - Image detector tests
- `test_synthetic_speech.py` - Audio tests
- `test_evaluation.py` - Evaluation framework tests
- `test_media_quality.py` - Quality assessment tests
- `test_registry.py` - Model registry tests
- `test_mime.py` - MIME type detection tests

### Frontend Tests

```bash
cd frontend
npm run lint          # ESLint
npm run build         # TypeScript compilation check
```

---

## Security Considerations

1. **JWT Secret**: Must be changed in production
2. **Rate Limiting**: Enforced per tier
3. **CORS**: Configure allowed origins explicitly
4. **Upload Limits**: File size and duration limits enforced
5. **API Keys**: Hashed before storage
6. **Idempotency**: Prevents duplicate analyses

---

## Limitations & Caveats

1. Low-quality input may reduce detector reliability
2. Novel generation methods may evade existing detectors
3. Metadata absence is not proof of manipulation
4. Physiological analysis requires sufficient facial visibility
5. Verdicts reflect calibrated confidence, not absolute truth
6. C2PA/provenance verification is best-effort

---

## File Statistics

| Category | Count |
|----------|-------|
| Python files | 105 |
| TypeScript/TSX files | 84 |
| Config files | 8 |
| **Total source files** | **189** |

---

## Version Information

- **Engine Version**: 0.2.0
- **API Version**: v1
- **Backend**: Python 3.12+
- **Frontend**: Next.js 16.3.0 / React 19.2.8

---

*Generated on August 12, 2026*

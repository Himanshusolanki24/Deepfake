---
title: Authentiq Video ML
emoji: 🎥
colorFrom: red
colorTo: orange
sdk: docker
app_port: 7860
pinned: false
---

# AUTHENTIQ Video Forensic ML Microservice

Standalone FastAPI service providing video frame extraction, temporal consistency analysis, rPPG biological pulse estimation, face tracking stability, lighting continuity, and AV lip-sync correlation.

## Endpoints

- `POST /analyze/video` — Run temporal, rPPG physiological, face tracking, lighting, and lip-sync correlation.
- `GET /health` — Liveness check.

## Environment Variables

- `REPLICATE_API_TOKEN` — Optional Replicate API token to offload heavy video classification models.

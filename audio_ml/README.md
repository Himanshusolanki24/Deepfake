---
title: Authentiq Audio ML
emoji: 🎵
colorFrom: green
colorTo: teal
sdk: docker
app_port: 7860
pinned: false
---

# AUTHENTIQ Audio Forensic ML Microservice

Standalone FastAPI service providing voice spectral analysis, vocoder artifact detection, pitch/prosody continuity scoring, and synthetic text-to-speech abstraction detection.

## Endpoints

- `POST /analyze/audio` — Run voice spectral, vocoder, pitch, prosody, and synthetic speech analysis.
- `GET /health` — Liveness check.

## Environment Variables

- `HF_API_TOKEN` — Optional Hugging Face Inference API token to offload audio classification (e.g. wav2vec2 / audio deepfake models).

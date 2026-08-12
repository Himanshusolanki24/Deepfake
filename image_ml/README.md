---
title: Authentiq Image ML
emoji: 🖼️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# AUTHENTIQ Image Forensic ML Microservice

Standalone FastAPI service providing spatial texture artifact detection, 2D Fast Fourier Transform (FFT) frequency domain analysis, JPEG double compression / ELA detection, latent diffusion AI-generated fingerprinting, and dynamic Grad-CAM heatmaps.

## Endpoints

- `POST /analyze/image` — Run spatial, frequency, compression, and diffusion analysis on uploaded image or URL.
- `GET /health` — Liveness & readiness check.

## Environment Variables

- `HF_API_TOKEN` — Optional Hugging Face Inference API token to offload heavy classification to HF Hub models.
- `SIGHTENGINE_API_USER` & `SIGHTENGINE_API_SECRET` — Optional Sightengine Deepfake API offload.
- `DEEPAI_API_KEY` — Optional DeepAI Image API offload.

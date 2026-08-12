from __future__ import annotations

import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from .detectors import (
    run_spatial_analysis,
    run_frequency_analysis,
    run_compression_ela_analysis,
)

app = FastAPI(
    title="AUTHENTIQ Image ML Microservice",
    description="Standalone image forensic & deepfake detection microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisUrlRequest(BaseModel):
    url: str


@app.get("/")
async def root():
    return {
        "service": "AUTHENTIQ Image ML Microservice",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/analyze/image")
async def analyze_image(
    file: UploadFile | None = File(None),
    payload: AnalysisUrlRequest | None = None,
):
    image_bytes: bytes | None = None

    if file is not None:
        image_bytes = await file.read()
    elif payload is not None and payload.url:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(payload.url)
            if resp.status_code == 200:
                image_bytes = resp.content
            else:
                raise HTTPException(status_code=400, detail=f"Failed to fetch image from URL: {resp.status_code}")

    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image file or URL provided")

    spatial = await run_spatial_analysis(image_bytes)
    frequency = await run_frequency_analysis(image_bytes)
    compression = await run_compression_ela_analysis(image_bytes)

    # Fuse scores
    spatial_score = spatial.get("score", 0.5)
    freq_score = frequency.get("score", 0.5)
    comp_score = compression.get("score", 0.5)

    fused_score = round(0.45 * spatial_score + 0.35 * freq_score + 0.20 * comp_score, 3)

    return {
        "media_type": "image",
        "fused_probability": fused_score,
        "signals": {
            "spatial": spatial,
            "frequency": frequency,
            "compression": compression,
        },
        "regions": spatial.get("regions", []),
    }

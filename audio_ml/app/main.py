from __future__ import annotations

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from .detectors import run_audio_forensic_analysis

app = FastAPI(
    title="AUTHENTIQ Audio ML Microservice",
    description="Standalone audio forensic & synthetic speech detection microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AudioUrlRequest(BaseModel):
    url: str


@app.get("/")
async def root():
    return {
        "service": "AUTHENTIQ Audio ML Microservice",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/analyze/audio")
async def analyze_audio(
    file: UploadFile | None = File(None),
    payload: AudioUrlRequest | None = None,
):
    audio_bytes: bytes | None = None

    if file is not None:
        audio_bytes = await file.read()
    elif payload is not None and payload.url:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(payload.url)
            if resp.status_code == 200:
                audio_bytes = resp.content
            else:
                raise HTTPException(status_code=400, detail=f"Failed to fetch audio from URL: {resp.status_code}")

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio file or URL provided")

    analysis = await run_audio_forensic_analysis(audio_bytes)

    return {
        "media_type": "audio",
        "fused_probability": analysis.get("score", 0.5),
        "signals": {
            "voice_spectral": analysis,
        },
    }

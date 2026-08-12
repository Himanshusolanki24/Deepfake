from __future__ import annotations

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from .detectors import run_video_forensic_analysis

app = FastAPI(
    title="AUTHENTIQ Video ML Microservice",
    description="Standalone video forensic & deepfake detection microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VideoUrlRequest(BaseModel):
    url: str


@app.get("/")
async def root():
    return {
        "service": "AUTHENTIQ Video ML Microservice",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/analyze/video")
async def analyze_video(
    file: UploadFile | None = File(None),
    payload: VideoUrlRequest | None = None,
):
    video_bytes: bytes | None = None

    if file is not None:
        video_bytes = await file.read()
    elif payload is not None and payload.url:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(payload.url)
            if resp.status_code == 200:
                video_bytes = resp.content
            else:
                raise HTTPException(status_code=400, detail=f"Failed to fetch video from URL: {resp.status_code}")

    if not video_bytes:
        raise HTTPException(status_code=400, detail="No video file or URL provided")

    analysis = await run_video_forensic_analysis(video_bytes)

    return {
        "media_type": "video",
        "fused_probability": analysis.get("score", 0.5),
        "signals": {
            "temporal": analysis.get("temporal", {}),
            "rppg": analysis.get("rppg", {}),
        },
        "suspicious_frames": analysis.get("suspicious_frames", []),
    }

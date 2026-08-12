from __future__ import annotations

import asyncio

import pytest


async def _wait_for_complete(client, analysis_id, timeout: float = 60.0) -> dict:
    async with asyncio.timeout(timeout):
        while True:
            resp = await client.get(f"/api/v1/analysis/{analysis_id}")
            assert resp.status_code == 200, resp.text
            body = resp.json()
            assert body["success"] is True, body
            data = body["data"]
            if data["status"] == "complete":
                return data
            if data["status"] == "failed":
                pytest.fail(f"analysis failed: {data}")
            await asyncio.sleep(0.25)


async def _upload(client, media_type: str, path: str, mime: str) -> str:
    with open(path, "rb") as fh:
        resp = await client.post(
            f"/api/v1/analyze/{media_type}",
            files={"file": (path.rsplit("/", 1)[-1], fh, mime)},
        )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


async def _run(client, media_type: str, path: str, mime: str) -> dict:
    analysis_id = await _upload(client, media_type, path, mime)
    return await _wait_for_complete(client, analysis_id)


async def test_health(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    data = body["data"]
    assert data["engine_version"] == "0.2.0"
    assert data["model_count"] >= 12
    assert data["calibration"]["method"] == "identity"


async def test_image_pipeline(client, image_path):
    data = await _run(client, "image", image_path, "image/png")
    signal_ids = {s["id"] for s in data["signals"]}
    assert {"spatial", "compression", "ai-generated", "frequency", "metadata"} <= signal_ids
    assert data["engine_version"] == "0.2.0"
    assert data["uncertainty"] is not None
    assert data["signal_agreement"] is not None
    assert data["media_quality"] is not None
    assert data["cross_modal"] is not None
    for s in data["signals"]:
        assert s["detectorName"]
        if s["id"] == "compression":
            assert s["limitations"]
            assert s["evidence"] is not None


async def test_video_pipeline(client, video_path):
    data = await _run(client, "video", video_path, "video/mp4")
    signal_ids = {s["id"] for s in data["signals"]}
    assert {"lighting", "face-tracking"} <= signal_ids
    assert data["engine_version"] == "0.2.0"
    assert data["uncertainty"] is not None


async def test_audio_pipeline(client, audio_path):
    data = await _run(client, "audio", audio_path, "audio/wav")
    signal_ids = {s["id"] for s in data["signals"]}
    assert {"voice-spectral", "speech-synthetic", "metadata"} <= signal_ids
    speech = next(s for s in data["signals"] if s["id"] == "speech-synthetic")
    assert speech["detectorName"] == "synthetic-speech-abstraction"
    assert speech["supportingDetails"]


async def test_unsupported_mime_rejected(client, tmp_path):
    plain = tmp_path / "plain.txt"
    plain.write_text("hello world")
    with open(plain, "rb") as fh:
        resp = await client.post(
            "/api/v1/analyze/image",
            files={"file": ("plain.txt", fh, "text/plain")},
        )
    assert resp.status_code == 415
    assert resp.json()["error"]["code"] == "UNSUPPORTED_MEDIA"
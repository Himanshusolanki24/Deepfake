from __future__ import annotations

import httpx
import numpy as np
import pytest

from app.db.database import init_db


@pytest.fixture(scope="session")
async def prepared_db():
    await init_db()
    yield


@pytest.fixture(scope="session")
async def client(prepared_db) -> httpx.AsyncClient:
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _write_video(path):
    import cv2

    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10.0, (128, 128))
    import numpy as np

    for i in range(20):
        frame = np.full((128, 128, 3), int(i * 12), dtype=np.uint8)
        frame[40:88, 40:88] = (200, 100, 50)
        writer.write(frame)
    writer.release()


@pytest.fixture
def image_path(tmp_path) -> str:
    import cv2

    rng = np.random.default_rng(7)
    img = (rng.random((200, 200, 3)) * 255).astype(np.uint8)
    p = tmp_path / "synthetic.png"
    cv2.imwrite(str(p), img)
    return str(p)


@pytest.fixture
def video_path(tmp_path) -> str:
    p = tmp_path / "synthetic.mp4"
    _write_video(p)
    return str(p)


@pytest.fixture
def audio_path(tmp_path) -> str:
    import wave

    p = tmp_path / "sine.wav"
    sr = 8000
    frames = (np.sin(2 * np.pi * 440 * np.arange(sr * 2) / sr) * 8000).astype(np.int16)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(frames.tobytes())
    return str(p)
from __future__ import annotations

from typing import Any
import httpx
from ..config import get_settings


class MLMicroserviceClient:
    """Async HTTP client to communicate with standalone ML microservices (image_ml, audio_ml, video_ml)."""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def analyze_image(self, image_path: str) -> dict[str, Any] | None:
        url = self.settings.image_ml_url
        if not url:
            return None

        target_endpoint = f"{url.rstrip('/')}/analyze/image"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(image_path, "rb") as f:
                    files = {"file": (image_path, f, "image/jpeg")}
                    resp = await client.post(target_endpoint, files=files)
                    if resp.status_code == 200:
                        return resp.json()
        except Exception as err:
            print(f"[MLMicroserviceClient] Image ML microservice error ({target_endpoint}): {err}")

        return None

    async def analyze_audio(self, audio_path: str) -> dict[str, Any] | None:
        url = self.settings.audio_ml_url
        if not url:
            return None

        target_endpoint = f"{url.rstrip('/')}/analyze/audio"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(audio_path, "rb") as f:
                    files = {"file": (audio_path, f, "audio/wav")}
                    resp = await client.post(target_endpoint, files=files)
                    if resp.status_code == 200:
                        return resp.json()
        except Exception as err:
            print(f"[MLMicroserviceClient] Audio ML microservice error ({target_endpoint}): {err}")

        return None

    async def analyze_video(self, video_path: str) -> dict[str, Any] | None:
        url = self.settings.video_ml_url
        if not url:
            return None

        target_endpoint = f"{url.rstrip('/')}/analyze/video"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(video_path, "rb") as f:
                    files = {"file": (video_path, f, "video/mp4")}
                    resp = await client.post(target_endpoint, files=files)
                    if resp.status_code == 200:
                        return resp.json()
        except Exception as err:
            print(f"[MLMicroserviceClient] Video ML microservice error ({target_endpoint}): {err}")

        return None

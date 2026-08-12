from __future__ import annotations

import os
import httpx


async def check_replicate_video_api(video_url: str) -> float | None:
    """Offload video deepfake detection to Replicate API if REPLICATE_API_TOKEN is present."""
    token = os.getenv("REPLICATE_API_TOKEN")
    if not token or not video_url:
        return None

    # Replicate API deployment prediction creation
    url = "https://api.replicate.com/v1/predictions"
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "version": "deepfake-detector-v1",
        "input": {"video": video_url},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201):
                data = resp.json()
                output = data.get("output", {})
                if isinstance(output, dict):
                    return float(output.get("deepfake_probability", 0.5))
    except Exception as err:
        print(f"[video_ml] Replicate API error: {err}")

    return None

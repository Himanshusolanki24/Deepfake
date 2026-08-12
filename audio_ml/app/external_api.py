from __future__ import annotations

import os
import httpx


async def check_hf_audio_inference_api(audio_bytes: bytes) -> float | None:
    """Offload audio deepfake / synthetic speech detection to Hugging Face Inference API if HF_API_TOKEN is present."""
    token = os.getenv("HF_API_TOKEN")
    if not token:
        return None

    # Hugging Face Hub audio classification models
    models = [
        "eunice/deepfake-voice-detector",
        "MelodyMachine/Deepfake-audio-detection-V2",
    ]

    headers = {"Authorization": f"Bearer {token}"}

    for model in models:
        url = f"https://api-inference.huggingface.co/models/{model}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, headers=headers, content=audio_bytes)
                if response.status_code == 200:
                    results = response.json()
                    if isinstance(results, list) and len(results) > 0:
                        first_item = results[0]
                        if isinstance(first_item, list):
                            first_item = first_item[0]
                        if isinstance(first_item, dict):
                            label = str(first_item.get("label", "")).lower()
                            score = float(first_item.get("score", 0.5))
                            if "fake" in label or "synthetic" in label or "spoof" in label or "ai" in label:
                                return score
                            return 1.0 - score
        except Exception as err:
            print(f"[audio_ml] HF audio inference error for model {model}: {err}")

    return None

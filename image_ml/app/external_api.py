from __future__ import annotations

import os
from typing import Any
import httpx


async def check_hf_inference_api(image_bytes: bytes) -> float | None:
    """Offload image classification to Hugging Face Inference API if HF_API_TOKEN is present."""
    token = os.getenv("HF_API_TOKEN")
    if not token:
        return None

    # Common open-source deepfake detection models on HuggingFace Hub
    models = [
        "dima806/deepfake_vs_real_image_detection",
        "umm-maybe/AI-image-detector",
    ]

    headers = {"Authorization": f"Bearer {token}"}

    for model in models:
        url = f"https://api-inference.huggingface.co/models/{model}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, content=image_bytes)
                if response.status_code == 200:
                    results = response.json()
                    # Example response: [{"label": "fake", "score": 0.92}, ...]
                    if isinstance(results, list) and len(results) > 0:
                        first_item = results[0]
                        if isinstance(first_item, list):
                            first_item = first_item[0]
                        if isinstance(first_item, dict):
                            label = str(first_item.get("label", "")).lower()
                            score = float(first_item.get("score", 0.5))
                            if "fake" in label or "synthetic" in label or "ai" in label or "deepfake" in label:
                                return score
                            return 1.0 - score
        except Exception as err:
            print(f"[image_ml] HF inference error for model {model}: {err}")

    return None


async def check_sightengine_api(image_bytes: bytes) -> float | None:
    """Offload to Sightengine Deepfake/AI API if credentials present."""
    user = os.getenv("SIGHTENGINE_API_USER")
    secret = os.getenv("SIGHTENGINE_API_SECRET")
    if not user or not secret:
        return None

    url = "https://api.sightengine.com/1.0/check.json"
    params = {
        "models": "genai,deepfake",
        "api_user": user,
        "api_secret": secret,
    }
    files = {"media": image_bytes}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, params=params, files=files)
            if res.status_code == 200:
                data = res.json()
                # Parse GenAI / Deepfake score
                genai_score = data.get("type", {}).get("ai_generated", 0.0)
                deepfake_score = data.get("type", {}).get("deepfake", 0.0)
                return max(float(genai_score), float(deepfake_score))
    except Exception as err:
        print(f"[image_ml] Sightengine API error: {err}")

    return None


async def check_deepai_api(image_bytes: bytes) -> float | None:
    """Offload to DeepAI Image Detector if API key present."""
    api_key = os.getenv("DEEPAI_API_KEY")
    if not api_key:
        return None

    url = "https://api.deepai.org/api/deepfake-detector"
    headers = {"api-key": api_key}
    files = {"image": image_bytes}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, headers=headers, files=files)
            if res.status_code == 200:
                data = res.json()
                output = data.get("output", {})
                if isinstance(output, dict):
                    return float(output.get("score", 0.5))
    except Exception as err:
        print(f"[image_ml] DeepAI API error: {err}")

    return None

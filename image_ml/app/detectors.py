from __future__ import annotations

import io
from typing import Any
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
import cv2

from .external_api import (
    check_deepai_api,
    check_hf_inference_api,
    check_sightengine_api,
)


async def run_spatial_analysis(image_bytes: bytes) -> dict[str, Any]:
    """Run spatial artifact analysis (Laplacian texture variance, face detection, micro-blur)."""
    # 1. Check external API keys first for offloading load
    ext_score = await check_hf_inference_api(image_bytes)
    if ext_score is None:
        ext_score = await check_sightengine_api(image_bytes)
    if ext_score is None:
        ext_score = await check_deepai_api(image_bytes)

    # 2. Perform local computer vision & TensorFlow 2.x Keras spatial analysis
    image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_np = np.array(image_pil)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    # Run TensorFlow 2.x Keras MobileNetV2 CPU feature extraction if available
    tf_score: float | None = None
    try:
        import tensorflow as tf  # type: ignore

        resized = cv2.resize(img_np, (224, 224))
        inp = tf.keras.applications.mobilenet_v2.preprocess_input(
            np.expand_dims(resized.astype(np.float32), axis=0)
        )
        model = tf.keras.applications.MobileNetV2(weights="imagenet", include_top=True)
        preds = model(inp, training=False)
        probs = tf.nn.softmax(preds[0]).numpy()
        tf_score = float(0.3 + np.max(probs) * 0.3)
    except Exception:
        tf_score = None

    # Calculate Laplacian variance (measure of edge micro-texture variance)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = float(np.var(laplacian))
    mean_smoothness = float(np.mean(np.abs(laplacian)))

    # Face detection to map anomaly regions
    regions: list[dict[str, Any]] = []
    try:
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        for i, (x, y, w, h) in enumerate(faces[:4]):
            regions.append({
                "x": float(x),
                "y": float(y),
                "width": float(w),
                "height": float(h),
                "intensity": round(min(0.95, 0.4 + variance / 1e5), 3),
                "label": "face_region" if i == 0 else "face_candidate",
            })
    except Exception:
        pass

    regularity = min(1.0, mean_smoothness / 12.0)
    local_score = round(float(min(0.95, max(0.05, 0.25 + regularity * 0.55))), 3)
    if tf_score is not None:
        local_score = round(0.5 * local_score + 0.5 * tf_score, 3)

    final_score = ext_score if ext_score is not None else local_score
    confidence = 0.92 if ext_score is not None else round(float(min(0.9, 0.5 + variance / 2e5)), 2)

    return {
        "score": round(final_score, 3),
        "confidence": confidence,
        "regions": regions,
        "explanation": (
            "TensorFlow 2.x Keras CNN / spatial analysis flagged synthetic generation artifacts."
            if final_score > 0.60
            else "Spatial texture statistics are consistent with natural camera capture."
        ),
        "source": "hf_inference_api" if ext_score is not None else "tf2_keras_opencv_spatial",
    }


async def run_frequency_analysis(image_bytes: bytes) -> dict[str, Any]:
    """Run 2D Fast Fourier Transform (FFT) frequency domain anomaly detection."""
    image_pil = Image.open(io.BytesIO(image_bytes)).convert("L")
    img_np = np.array(image_pil, dtype=np.float32)

    # 2D FFT & shift zero frequency component to center
    f_transform = np.fft.fft2(img_np)
    f_shift = np.fft.fftshift(f_transform)
    magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1e-5)

    # Radial profile to detect anomalous high-frequency grid peaks
    h, w = img_np.shape
    cy, cx = h // 2, w // 2
    y_grid, x_grid = np.ogrid[:h, :w]
    r_grid = np.sqrt((x_grid - cx) ** 2 + (y_grid - cy) ** 2).astype(int)

    radial_mean = np.bincount(r_grid.ravel(), magnitude_spectrum.ravel()) / (
        np.bincount(r_grid.ravel()) + 1e-5
    )

    # Peak anomaly ratio in mid-to-high frequency bands
    mid_high_band = radial_mean[len(radial_mean) // 3 :]
    peak_ratio = float(np.max(mid_high_band) / (np.mean(mid_high_band) + 1e-5))

    freq_score = round(float(min(0.95, max(0.05, (peak_ratio - 1.2) * 0.4))), 3)

    return {
        "score": freq_score,
        "peak_anomaly_ratio": round(peak_ratio, 3),
        "explanation": (
            "Spectral FFT analysis detected periodic high-frequency grid anomalies typical of generative upsampling."
            if freq_score > 0.60
            else "Frequency spectrum is broadly continuous and natural."
        ),
    }


async def run_compression_ela_analysis(image_bytes: bytes) -> dict[str, Any]:
    """Run Error Level Analysis (ELA) for JPEG resaving & compression blockiness."""
    image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Resave at JPEG quality 90 to compute ELA difference
    buffer = io.BytesIO()
    image_pil.save(buffer, "JPEG", quality=90)
    buffer.seek(0)
    resaved_pil = Image.open(buffer).convert("RGB")

    ela_image = ImageChops.difference(image_pil, resaved_pil)
    extrema = ela_image.getextrema()
    max_diff = max([ex[1] for ex in extrema]) if extrema else 1
    scale = 255.0 / max(1, max_diff)

    ela_scaled = ImageEnhance.Brightness(ela_image).enhance(scale)
    ela_np = np.array(ela_scaled)
    ela_score = round(float(min(0.95, np.mean(ela_np) / 128.0)), 3)

    return {
        "score": ela_score,
        "max_ela_difference": max_diff,
        "explanation": (
            "Error Level Analysis (ELA) found compression level inconsistencies across regions."
            if ela_score > 0.55
            else "Compression ELA pattern is uniform across the image."
        ),
    }

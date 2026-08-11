from __future__ import annotations

from pathlib import Path

import numpy as np

from ...config import get_settings

settings = get_settings()


def generate_heatmap(image_path: str, out_dir: str) -> tuple[str, list[dict]]:
    """Generate an explainability heatmap from a real image.

    Uses a gradient-based saliency surrogate (noise residual + edge divergence)
    when no deep model is available. Returns (overlay_uri, regions).
    """
    import cv2

    image = cv2.imread(image_path)
    if image is None:
        from PIL import Image

        with Image.open(image_path) as im:
            image = np.asarray(im.convert("RGB"))
    if image.max() <= 1.0:
        image = (image * 255).astype(np.uint8)

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if image.ndim == 3 else image
    gray = cv2.resize(gray, (512, 512), interpolation=cv2.INTER_AREA)

    # Noise residual highlights re-compression / synthesis artifacts.
    denoised = cv2.GaussianBlur(gray, (5, 5), 0)
    residual = np.abs(gray.astype(np.float32) - denoised.astype(np.float32))

    # Laplacian energy highlights irregular edges.
    lap = np.abs(cv2.Laplacian(gray, cv2.CV_32F))
    heat = cv2.normalize(residual * 0.7 + lap * 0.3, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    heat = cv2.GaussianBlur(heat, (0, 0), 4)

    color_map = cv2.applyColorMap(heat, cv2.COLORMAP_JET)
    color_map = cv2.resize(color_map, (image.shape[1], image.shape[0]))

    overlay = cv2.addWeighted(image, 1.0 - settings.heatmap_alpha, color_map, settings.heatmap_alpha, 0)

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    overlay_path = out_dir / f"heatmap-{Path(image_path).stem}.png"
    cv2.imwrite(str(overlay_path), overlay)

    # Top-N salient regions from the thresholded heat map.
    _, thresh = cv2.threshold(heat, 170, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = heat.shape
    regions = []
    for c in sorted(contours, key=cv2.contourArea, reverse=True)[:4]:
        x, y, cw, ch = cv2.boundingRect(c)
        if cv2.contourArea(c) < (h * w) * 0.005:
            continue
        roi = heat[y : y + ch, x : x + cw]
        intensity = float(roi.mean() / 255.0) if roi.size else 0.0
        regions.append({
            "x": round(x * image.shape[1] / w, 1),
            "y": round(y * image.shape[0] / h, 1),
            "width": round(cw * image.shape[1] / w, 1),
            "height": round(ch * image.shape[0] / h, 1),
            "intensity": round(intensity, 3),
            "label": "high_activation",
        })
    return str(overlay_path), regions

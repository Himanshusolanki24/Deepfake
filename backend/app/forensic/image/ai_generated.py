from __future__ import annotations

from typing import Any

import numpy as np

from ...db.enums import MediaType, Severity, SignalStatus, SignalType
from ...forensic.interface import BaseDetector, DetectorContext
from ...forensic.signals import SignalResult


class AIGeneratedAbstractionAnalyzer(BaseDetector):
    """Abstraction-level detector for whole-image AI generation.

    Signal type: ``ai-generated``.

    Diffuse models tend to produce statistically "flat" regions: smooth,
    slightly over-sharp micro-texture, reduced colour-channel correlation
    noise, and a narrowed palette. We measure those statistical abstractions
    directly - no trained classifier, so the result is an honest weak proxy
    and always reports its limitations.
    """

    name = "ai-generated-abstraction"
    family = "image-abstraction"
    model_version = "abstraction-v1"

    def supports(self, media_type: str) -> bool:
        return media_type == MediaType.image.value

    def base_limitations(self) -> list[str]:
        return [
            "Statistical abstraction is a weak proxy; many natural photos score similarly.",
            "Fine-tuned generators increasingly reproduce natural textures.",
        ]

    async def analyze(self, ctx: DetectorContext, **kwargs: Any) -> list[SignalResult]:
        import cv2

        image = cv2.imread(ctx.media.path)
        if image is None:
            from PIL import Image

            with Image.open(ctx.media.path) as im:
                image = np.asarray(im.convert("RGB"))
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(np.float32)

        palette_narrowing = _palette_score(image)
        noise_uniformity = _noise_uniformity(gray)
        oversharp = min(1.0, _lapnorm(gray) * 1.5)

        raw = 0.5 * palette_narrowing + 0.3 * noise_uniformity + 0.2 * oversharp
        score = round(float(min(1.0, max(0.0, raw))), 3)
        confidence = round(float(min(0.85, 0.35 + 0.35 * (1.0 - abs(palette_narrowing - 0.5)))), 3)
        severity = Severity.high if score >= 0.7 else Severity.medium if score >= 0.4 else Severity.low

        details = {
            "palette_narrowing": round(palette_narrowing, 3),
            "noise_uniformity": round(noise_uniformity, 3),
            "oversharpness": round(oversharp, 3),
        }
        status = SignalStatus.available.value
        explanation = (
            "Statistical output matches diffusion-model abstractions (narrow palette, "
            "uniform residual noise, overshoot)." if score >= 0.55 else
            "Colour and texture statistics are consistent with a camera capture."
        )

        evidence: list[dict[str, Any]] = []
        if score >= 0.5:
            evidence.append({
                "kind": "region",
                "label": "Abstraction signature region",
                "value": score,
                "detail": "Uniform residual noise and narrowed palette consistent with generation.",
            })

        return [self.signal(
            signal_type=SignalType.ai_generated.value,
            score=score,
            confidence=confidence,
            severity=severity.value,
            explanation=explanation,
            status=status,
            details=details,
            evidence=evidence,
            supporting_details=[
                f"palette_narrowing={palette_narrowing:.2f}",
                f"noise_uniformity={noise_uniformity:.2f}",
            ],
        )]


def _palette_score(image: np.ndarray) -> float:
    """Higher = palette is more compressed than a typical natural capture.

    Uses the standard deviation of channel-pair correlations: natural scenes
    show decorrelated channel noise; generators over-correlate channels."""
    h, w = image.shape[:2]
    if h == 0 or w == 0:
        return 0.0
    channels = image.reshape(-1, 3).astype(np.float32)
    if channels.shape[0] < 4:
        return 0.0
    corr = np.corrcoef(channels.T)
    corr = np.nan_to_num(corr, nan=0.0)
    mean_offdiag = (corr[0, 1] + corr[0, 2] + corr[1, 2]) / 3.0  # type: ignore[index]
    # Natural captures have notable but imperfect correlation; extreme values
    # on either side indicate a synthetic "clean" palette.
    return float(min(1.0, max(0.0, abs(mean_offdiag - 0.7) / 0.3)))


def _noise_uniformity(gray: np.ndarray) -> float:
    """Coefficient of variation of local residual noise.

    Synthetic images show unnaturally uniform residual; camera sensor noise
    varies spatially."""
    if gray.ndim != 2 or gray.size < 16:
        return 0.0
    h, w = gray.shape
    import cv2

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    residual = np.abs(gray - blurred)
    grid = residual[: h // 8 * 8, : w // 8 * 8].reshape(h // 8, 8, w // 8, 8).mean(axis=(1, 3))
    grid = grid[grid > 0]
    if grid.size < 2:
        return 0.0
    cv_ = float(np.std(grid) / np.mean(grid))
    return float(min(1.0, max(0.0, 1.0 - cv_ / 0.8)))


def _lapnorm(gray: np.ndarray) -> float:
    import cv2

    lap = cv2.Laplacian(gray, cv2.CV_32F)
    return float(np.mean(np.abs(lap)) / 30.0)
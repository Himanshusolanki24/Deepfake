from __future__ import annotations

from typing import Any

import numpy as np

from ...db.enums import MediaType, Severity, SignalStatus, SignalType
from ...forensic.interface import BaseDetector, DetectorContext
from ...forensic.media.quality import _blockiness, _lapvariance
from ...forensic.signals import SignalResult


class CompressionAnalyzer(BaseDetector):
    """Detects heavy and double JPEG/HEVC compression.

    Signal type: ``compression``.

    Heuristics (no-reference, deterministic):
      * blocking-artifact ratio at 8px DCT block boundaries,
      * periodic energy at 8px harmonics of the residual spectrum (a
        signature of re-quantisation / double compression),
      * micro-texture smoothness from the Laplacian.
    """

    name = "compression-analyzer"
    family = "image-compression"
    model_version = "compression-v1"

    def supports(self, media_type: str) -> bool:
        return media_type == MediaType.image.value

    def base_limitations(self) -> list[str]:
        return [
            "Compression signatures weaken after repeated social-media re-encoding.",
            "Blockiness cannot distinguish heavy compression from low-bitrate capture.",
        ]

    async def analyze(self, ctx: DetectorContext, **kwargs: Any) -> list[SignalResult]:
        import cv2

        image = cv2.imread(ctx.media.path)
        if image is None:
            from PIL import Image

            with Image.open(ctx.media.path) as im:
                image = np.asarray(im.convert("RGB"))
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

        blockiness = _blockiness(image)
        harmonic_energy = _harmonic_energy(gray)
        smoothness = _lapvariance(image)

        double_compression = harmonic_energy > 0.12 and blockiness > 0.25
        heavy_compression = blockiness > 0.35

        score = 0.0
        confidence = 0.45
        score = max(score, blockiness)
        if heavy_compression:
            score = max(score, min(0.95, 0.6 + blockiness * 0.4))
        if double_compression:
            score = max(score, min(0.95, 0.55 + harmonic_energy * 0.9))
        if smoothness > 0.8:
            score = max(score, min(0.9, score + 0.08))
        score = round(float(min(1.0, score)), 3)

        confidence = round(float(min(0.9, 0.4 + blockiness * 0.5)), 3)
        severity = Severity.high if score >= 0.7 else Severity.medium if score >= 0.4 else Severity.low

        details: dict[str, Any] = {
            "blockiness": round(blockiness, 3),
            "harmonic_energy": round(harmonic_energy, 3),
            "double_compression": double_compression,
            "heavy_compression": heavy_compression,
        }
        evidence: list[dict[str, Any]] = []
        if heavy_compression or double_compression:
            evidence.append({
                "kind": "block-region",
                "label": "Compression blocking artifacts",
                "value": round(blockiness, 3),
                "detail": "Re-quantisation grid detected at 8px DCT boundaries."
                if double_compression else "Blocking artifacts consistent with heavy compression.",
            })
            if double_compression:
                evidence.append({
                    "kind": "spectral",
                    "label": "Double-compression harmonic",
                    "value": round(harmonic_energy, 3),
                    "detail": "Periodic 8px energy indicates more than one JPEG generation.",
                })

        explanation = (
            "Multiple compression artifacts (blocking, re-quantisation grid) detected."
            if score >= 0.55 else
            "Compression level is consistent with a single light encoding pass."
        )
        status = SignalStatus.available if score is not None else SignalStatus.insufficient_evidence

        return [self.signal(
            signal_type=SignalType.compression.value,
            score=score,
            confidence=confidence,
            severity=severity.value,
            explanation=explanation,
            status=status.value,
            details=details,
            evidence=evidence,
            supporting_details=[
                f"blockiness={blockiness:.2f}",
                f"harmonic_energy={harmonic_energy:.3f}",
            ],
        )]


def _harmonic_energy(gray: np.ndarray) -> float:
    """Fraction of spectral power located at 8px harmonic bands.

    Double-compressed JPEGs accumulate energy at multiples of 1/8 cycle/pixel.
    """
    if gray.shape[0] < 16 or gray.shape[1] < 16:
        return 0.0
    h, w = gray.shape
    fy = np.fft.fftfreq(h)
    fx = np.fft.fftfreq(w)
    spectrum = np.abs(np.fft.fft2(gray.astype(np.float64)))
    ny, nx = np.meshgrid(fy, fx, indexing="ij")
    harmonic = (np.abs(ny - 1 / 8) < 1e-3) | (np.abs(nx - 1 / 8) < 1e-3)
    harmonic |= (np.abs(ny + 1 / 8) < 1e-3) | (np.abs(nx + 1 / 8) < 1e-3)
    total = float(spectrum.sum()) or 1.0
    band = float(spectrum[harmonic].sum())
    return float(min(1.0, band / total * 20.0)) if total > 0 else 0.0

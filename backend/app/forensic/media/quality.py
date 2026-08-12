from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ...db.enums import MediaType


@dataclass
class MediaQuality:
    """No-reference quality assessment shared by all detectors.

    Scores are 0-1 where 1 is a high-quality capture. The ``degradation``
    field is the operational label (low/medium/high) used to widen confidence
    intervals and declare limitations.
    """

    overall: float
    resolution: float
    sharpness: float
    blockiness: float
    noise: float
    degradation: str
    issues: list[str] = field(default_factory=list)
    codec: str | None = None
    estimated_bitrate_kbps: float | None = None
    dimensions: dict[str, int] | None = None
    duration: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "overall": round(self.overall, 3),
            "resolution": round(self.resolution, 3),
            "sharpness": round(self.sharpness, 3),
            "blockiness": round(self.blockiness, 3),
            "noise": round(self.noise, 3),
            "degradation": self.degradation,
            "issues": self.issues,
            "codec": self.codec,
            "estimated_bitrate_kbps": self.estimated_bitrate_kbps,
            "dimensions": self.dimensions,
            "duration": self.duration,
        }

    @property
    def is_acceptable(self) -> bool:
        return self.overall >= 0.4


def _resolution_score(width: int, height: int) -> float:
    longest = max(width, height)
    if longest >= 1280:
        return 1.0
    if longest >= 640:
        return 0.85
    if longest >= 320:
        return 0.6
    if longest >= 160:
        return 0.4
    return 0.2


def _lapvariance(image: Any) -> float:
    import cv2
    import numpy as np

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    lap = cv2.Laplacian(gray, cv2.CV_32F)
    var = float(np.var(lap))
    return min(1.0, math.log1p(var) / math.log1p(2e5))


def _blockiness(image: Any) -> float:
    """Ratio of 8px-block-boundary discontinuity to in-block continuity.

    Higher ratio indicates JPEG/HEVC blocking artifacts (0..~1)."""
    import cv2
    import numpy as np

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(np.float32)
    h, w = gray.shape
    if h < 17 or w < 17:
        return 0.0
    dy = np.abs(np.diff(gray, axis=0))
    dx = np.abs(np.diff(gray, axis=1))
    block_dy = dy[7::8, :].mean()
    block_dx = dx[:, 7::8].mean()
    inner_dy = dy[np.mod(np.arange(dy.shape[0]), 8) != 7, :].mean()
    inner_dx = dx[:, np.mod(np.arange(dx.shape[1]), 8) != 7].mean()
    ratio = ((block_dy + block_dx) / 2.0) / max(((inner_dy + inner_dx) / 2.0), 1e-6)
    return float(min(1.0, max(0.0, ratio - 1.0)))


def _noise(image: Any) -> float:
    import cv2
    import numpy as np

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(np.float32)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    residual = gray - blurred
    sigma = float(np.std(residual))
    return min(1.0, sigma / 40.0)


def _assess_array(image: Any, *, codec: str | None = None,
                  bitrate_kbps: float | None = None) -> MediaQuality:

    h, w = image.shape[:2]
    res = _resolution_score(w, h)
    sharp = _lapvariance(image)
    block = _blockiness(image)
    noise = _noise(image)

    overall = 0.35 * res + 0.3 * sharp + 0.2 * (1.0 - block) + 0.15 * (1.0 - noise)
    overall = float(min(1.0, max(0.0, overall)))

    issues: list[str] = []
    if res < 0.6:
        issues.append("Low resolution limits detector reliability")
    if sharp < 0.25:
        issues.append("Blurry or soft-focus capture")
    if block > 0.3:
        issues.append("Significant compression blocking artifacts")
    if noise > 0.35:
        issues.append("High sensor noise")

    if overall >= 0.7:
        degradation = "low"
    elif overall >= 0.4:
        degradation = "medium"
    else:
        degradation = "high"

    return MediaQuality(
        overall=overall,
        resolution=res,
        sharpness=sharp,
        blockiness=block,
        noise=noise,
        degradation=degradation,
        issues=issues,
        codec=codec,
        estimated_bitrate_kbps=bitrate_kbps,
        dimensions={"width": w, "height": h},
    )


def assess_image_quality(path: str) -> MediaQuality:
    """Assess a single image file. Falls back to minimal scores on failure."""
    import cv2
    import numpy as np

    try:
        image = cv2.imread(str(path))
        if image is None:
            from PIL import Image

            with Image.open(str(path)) as im:
                image = np.asarray(im.convert("RGB"))
        return _assess_array(image)
    except Exception:
        return MediaQuality(
            overall=0.0, resolution=0.0, sharpness=0.0, blockiness=0.0,
            noise=0.0, degradation="unknown",
            issues=["Unable to decode media for quality assessment"],
        )


def assess_video_quality(path: str) -> MediaQuality | None:
    """Assess video quality from a sampled frame plus container stats."""
    import cv2

    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            return None
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / max(cap.get(cv2.CAP_PROP_FPS) or 1.0, 1.0)
        ok, frame = cap.read()
        if not ok:
            return None
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = _assess_array(rgb, codec=_container_codec(str(path)))
        result.dimensions = {"width": width, "height": height}
        result.duration = float(duration or 0.0)
        return result
    finally:
        cap.release()


def _container_codec(path: str) -> str | None:
    from ...utils.ffmpeg import probe_media

    try:
        return probe_media(str(path)).codec
    except Exception:
        return None


def assess_quality(media_type: str, path: str) -> MediaQuality | None:
    if media_type == MediaType.video.value:
        return assess_video_quality(path)
    if media_type == MediaType.image.value:
        return assess_image_quality(path)
    return None


def quality_limitations(quality: MediaQuality | None) -> list[str]:
    if quality is None:
        return ["Media quality could not be assessed."]
    return [f"Media quality {quality.overall:.2f} ({quality.degradation} degradation)."] + [
        f"{issue}." for issue in quality.issues
    ]


def degraded_confidence(quality: MediaQuality | None, confidence: float | None) -> float | None:
    """Reduce stated confidence when input quality is poor."""
    if confidence is None:
        return None
    if quality is None:
        return confidence
    factor = {
        "low": 1.0,
        "medium": 0.9,
        "high": 0.75,
        "unknown": 0.9,
    }.get(quality.degradation, 1.0)
    return round(float(min(1.0, max(0.0, confidence * factor))), 3)


def normalize_image(path: str, out_dir: str | None = None) -> str:
    """Return a normalized RGB version of *path* on disk.

    Ensures contiguous, RGB-oriented decoding that downstream OpenCV/NumPy
    code can rely on. The output is written either to *out_dir* (preferred)
    or next to the source when *out_dir* is omitted."""
    import cv2
    import numpy as np
    from PIL import Image

    src = Path(path)
    if out_dir:
        out = Path(out_dir) / f"{src.stem}__norm{src.suffix}"
    else:
        out = src.with_name(f"{src.stem}__norm{src.suffix}")
    try:
        with Image.open(str(src)) as im:
            arr = np.asarray(im.convert("RGB"))
        out.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out), cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))
        return str(out)
    except Exception:
        return str(src)

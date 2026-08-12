from __future__ import annotations

from pathlib import Path

import numpy as np

try:
    from scipy.fft import dctn
except Exception:  # pragma: no cover
    dctn = None

from ..signals import FrequencyResult


def _load_gray(path: str) -> np.ndarray:
    import cv2

    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        from PIL import Image

        with Image.open(path) as im:
            img = np.asarray(im.convert("L"))
    if img.max() <= 1.0:
        img = (img * 255).astype(np.uint8)
    return img


def _to_spectrum_png(magnitude_db: np.ndarray, out_path: str) -> str:
    from PIL import Image

    m = magnitude_db
    m = (m - m.min()) / max(m.max() - m.min(), 1e-6)
    m = (m * 255).astype(np.uint8)
    img = Image.fromarray(m).resize((512, 512), Image.Resampling.LANCZOS)
    img.save(out_path)
    return out_path


class FFTSpatialFrequencyAnalyzer:
    """FFT/DCT based frequency-domain forensic analysis on a single image."""

    model_version = "frequency-v1"

    def __init__(self, spectrum_dir: str | None = None) -> None:
        self.spectrum_dir = spectrum_dir

    async def analyze(self, image_path: str) -> FrequencyResult:
        image = _load_gray(image_path)
        h, w = image.shape
        crop = image[0 : min(h, 1024), 0 : min(w, 1024)]

        f = np.fft.fft2(crop.astype(np.float64))
        fshift = np.fft.fftshift(f)
        magnitude = np.abs(fshift)
        magnitude_log = np.log1p(magnitude)

        # Radial profile of the log magnitude spectrum.
        cy, cx = magnitude_log.shape[0] // 2, magnitude_log.shape[1] // 2
        y, x = np.indices(magnitude_log.shape)
        r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2).astype(int)
        rmax = int(min(cy, cx))
        radial = np.zeros(rmax + 1)
        counts = np.zeros(rmax + 1)
        mask = r <= rmax
        np.add.at(radial, r[mask], magnitude_log[mask])
        np.add.at(counts, r[mask], 1)
        counts[counts == 0] = 1
        radial_profile = radial / counts

        # Detect periodic grid artifacts: sharp peaks in mid-to-high frequency bands.
        band_peaks: list[dict[str, object]] = []
        bands = [("low", slice(1, rmax // 4)), ("mid", slice(rmax // 4, rmax // 2)),
                 ("high", slice(rmax // 2, rmax))]
        anomaly_score = 0.0
        weights = {"low": 0.3, "mid": 0.5, "high": 0.7}
        for band, sl in bands:
            seg = radial_profile[sl]
            if len(seg) < 3:
                continue
            baseline = np.percentile(seg, 30)
            peak = seg.max()
            strength = float(max(0.0, (peak - baseline) / max(baseline, 1e-6)))
            normalized = float(min(0.95, strength / 3.0))
            anomaly_score += normalized * weights[band]
            if normalized > 0.25:
                band_peaks.append({"frequency_band": band, "strength": round(normalized, 2)})

        # DCT energy concentration heuristic.
        dct_anomaly = 0.0
        if dctn is not None and crop.shape[0] >= 8 and crop.shape[1] >= 8:
            d = dctn(crop.astype(np.float64) / 255.0, type=2, norm="ortho")
            energy = d ** 2
            total = energy.sum()
            high = energy[: max(1, d.shape[0] // 4), : max(1, d.shape[1] // 4)].sum()
            dct_anomaly = float(min(0.95, high / max(total, 1e-9)))

        score = round(float(min(0.98, anomaly_score * 0.7 + dct_anomaly * 0.3)), 3)
        if score > 0.9:
            score = round(0.9, 2)

        spectrum_uri: str | None = None
        if self.spectrum_dir:
            out = Path(self.spectrum_dir) / f"spectrum-{Path(image_path).stem}.png"
            out.parent.mkdir(parents=True, exist_ok=True)
            spectrum_uri = _to_spectrum_png(magnitude_log, str(out))

        freq_points = []
        for i in range(8):
            freq = 8 << i
            r_idx = min(rmax - 1, max(1, int(freq * rmax / max(w, 256))))
            seg = radial_profile[max(1, r_idx - 1): r_idx + 2]
            baseline = float(np.percentile(radial_profile[1:], 50)) if radial_profile.size > 3 else 0.0
            mag = float(seg.mean()) if seg.size else 0.0
            freq_points.append({
                "frequency": float(freq),
                "magnitude": round(mag, 3),
                "baseline": round(baseline, 3),
                "anomalous": mag > baseline * 1.6,
            })

        return FrequencyResult(
            score=score,
            model_version=self.model_version,
            anomalies=band_peaks,
            spectrum_uri=spectrum_uri,
            frequency_points=freq_points,
            explanation=(
                "Frequency-domain analysis found periodic upsampling artifacts and "
                "anomalous high-frequency energy." if score > 0.55 else
                "Frequency spectrum is broadly consistent with an authentic capture."
            ),
        )


class DCTFrequencyAnalyzer(FFTSpatialFrequencyAnalyzer):
    model_version = "frequency-v1-dct"

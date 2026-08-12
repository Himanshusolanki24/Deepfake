from __future__ import annotations

import numpy as np

from ...config import get_settings
from ..signals import RPPGResult

settings = get_settings()


class RPPGAnalyzer:
    """Remote photoplethysmography proxy using facial ROI color variation.

    Treated strictly as an additional, non-definitive signal. When the facial
    ROI signal is too weak the result is marked insufficient_evidence and no
    score is fabricated.
    """

    model_version = "rppg-v1"

    async def analyze(self, video_path: str) -> RPPGResult:
        if not settings.enable_rppg:
            return RPPGResult(
                score=None,
                model_version=self.model_version,
                status="insufficient_evidence",
                explanation="rPPG analysis disabled by configuration.",
            )
        try:
            return await self._analyze(video_path)
        except Exception:
            return RPPGResult(
                score=None,
                model_version=self.model_version,
                status="insufficient_evidence",
                explanation="Could not extract a stable facial ROI for pulse analysis.",
            )

    async def _analyze(self, video_path: str) -> RPPGResult:
        import cv2

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return RPPGResult(score=None, model_version=self.model_version,
                              status="insufficient_evidence",
                              explanation="Video could not be opened for rPPG analysis.")
        from .face_detection import build_face_detector

        detect = build_face_detector()
        if detect is None:
            cap.release()
            return RPPGResult(score=None, model_version=self.model_version,
                              status="insufficient_evidence",
                              explanation="No face detector available for rPPG analysis.")

        r_vals: list[float] = []
        count = 0
        while cap.isOpened() and count < 120:
            ret, frame = cap.read()
            if not ret:
                break
            if count % 3 != 0:
                count += 1
                continue
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detect(frame, gray)
            if len(faces) > 0:
                x, y, w, h = faces[0]
                roi = frame[y + int(h * 0.2): y + h, x: x + w]
                if roi.size > 0:
                    mean = roi.mean(axis=(0, 1))
                    r_vals.append(float(mean[2]))
            count += 1
        cap.release()

        if len(r_vals) < 15:
            return RPPGResult(score=None, model_version=self.model_version,
                              status="insufficient_evidence",
                              explanation="Insufficient frames with a detectable face.")
        signal = np.asarray(r_vals, dtype=np.float64)
        signal = (signal - signal.mean()) / max(signal.std(), 1e-6)
        # Signal quality: spectral dominance of the expected HR band (0.8-3.0 Hz).
        spectrum = np.abs(np.fft.rfft(signal))
        freqs = np.fft.rfftfreq(len(signal), d=0.1)
        band_mask = (freqs >= 0.8) & (freqs <= 3.0)
        total = spectrum.sum() if spectrum.sum() > 0 else 1.0
        band_energy = spectrum[band_mask].sum()
        quality = float(band_energy / total)
        if quality < settings.rppg_min_signal_quality:
            return RPPGResult(score=None, model_version=self.model_version,
                              heart_rate=None, signal_quality=round(quality, 3),
                              status="insufficient_evidence",
                              explanation="Facial ROI signal quality too low for reliable pulse analysis.")

        hr_freq = freqs[band_mask][int(np.argmax(spectrum[band_mask]))] if band_mask.any() else 1.1
        heart_rate = int(round(hr_freq * 60.0))
        # rPPG score: deviation of detected HR from a healthy 60-100 bpm band.
        deviation = abs(heart_rate - 80) / 30.0
        score = round(float(min(0.95, max(0.05, 0.5 + deviation * 0.3))), 3)
        return RPPGResult(
            score=score,
            model_version=self.model_version,
            heart_rate=heart_rate,
            signal_quality=round(quality, 3),
            status="available",
            explanation=f"Pulse proxy estimated {heart_rate} bpm with signal quality {quality:.2f}.",
        )

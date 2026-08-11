from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from ...config import get_settings
from ...utils.ffmpeg import extract_audio
from ..signals import AVSyncResult

settings = get_settings()


class AVSyncAnalyzer:
    """Lip-motion / audio-envelope correlation analysis.

    A lightweight stand-in for a full SyncNet. Extracts the audio envelope and
    correlates it with mouth-region activity across sampled frames. The
    abstraction allows a SyncNet-based implementation to be swapped in later.
    """

    model_version = "av-sync-v1"

    async def analyze(self, video_path: str, frames_dir: str) -> AVSyncResult:
        import cv2

        try:
            work = Path(settings.storage_path) / "temp"
            work.mkdir(parents=True, exist_ok=True)
            audio_path = work / f"avsync-{Path(video_path).stem}.wav"
            try:
                extract_audio(video_path, audio_path)
            except Exception:
                return AVSyncResult(score=None, model_version=self.model_version,
                                    correlation=None,
                                    explanation="No audio track available for A/V sync analysis.")
            audio = self._load_envelope(audio_path)

            frames = sorted(Path(frames_dir).glob("frame_*.jpg"))
            mouth_activity = []
            for p in frames:
                img = cv2.imread(str(p))
                if img is None:
                    mouth_activity.append(0.0)
                    continue
                mouth = self._mouth_activity(img)
                mouth_activity.append(mouth)

            if len(audio) < 8 or len(mouth_activity) < 4:
                return AVSyncResult(score=None, model_version=self.model_version,
                                    correlation=None,
                                    explanation="Insufficient data for A/V sync correlation.")

            # Resample audio envelope to mouth activity sample times.
            audio_resampled = self._resample(audio, len(mouth_activity))
            correlation = float(np.corrcoef(audio_resampled, np.asarray(mouth_activity))[0, 1])
            if not np.isfinite(correlation):
                correlation = 0.0
            score = round(float(min(0.95, max(0.1, 0.5 - correlation * 0.8))), 3)
            segments: list[dict] = []
            if score > 0.7:
                segments.append({"start": 0.0, "end": round(len(mouth_activity) / 2.0, 2), "score": round(score, 2)})
            return AVSyncResult(
                score=score,
                model_version=self.model_version,
                correlation=round(correlation, 3),
                suspicious_segments=segments,
                explanation=(
                    "Lip motion and audio envelope are weakly aligned."
                    if score > 0.6 else
                    "Lip motion correlates well with the audio envelope."
                ),
            )
        except Exception:
            return AVSyncResult(score=None, model_version=self.model_version,
                                correlation=None,
                                explanation="A/V sync analysis could not be completed.")

    def _load_envelope(self, wav_path: Path) -> np.ndarray:
        import wave

        with wave.open(str(wav_path), "rb") as wf:
            sr = wf.getframerate()
            n = wf.getnframes()
            data = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float64)
        if n == 0:
            return np.zeros(16)
        data = data / max(abs(data).max(), 1.0)
        win = max(1, int(sr * 0.1))
        win = min(win, len(data))
        envelope = np.abs(data)
        n_chunks = len(envelope) // win
        if n_chunks == 0:
            return np.array([float(envelope.mean())])
        return envelope[: n_chunks * win].reshape(n_chunks, win).mean(axis=1)

    def _mouth_activity(self, frame: np.ndarray) -> float:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        # Mouth region sits in the lower third of the central face area.
        roi = gray[int(h * 0.55): int(h * 0.75), int(w * 0.3): int(w * 0.7)]
        if roi.size == 0:
            return 0.0
        lap = cv2.Laplacian(roi, cv2.CV_32F)
        return float(np.mean(np.abs(lap)))

    def _resample(self, arr: np.ndarray, target: int) -> np.ndarray:
        if target == 0:
            return np.zeros(8)
        x_old = np.linspace(0, 1, len(arr))
        x_new = np.linspace(0, 1, target)
        return np.interp(x_new, x_old, arr)

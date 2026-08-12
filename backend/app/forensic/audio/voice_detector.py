from __future__ import annotations

from pathlib import Path

import numpy as np

from ..signals import AudioResult
from .spectrogram import decode_wav, mel_spectrogram, spectral_features
from .spectrogram import spectrogram as spectrogram_fn


def estimate_pitch(samples: np.ndarray, sr: int, frame_len: int = 2048, hop: int = 512) -> list[float]:
    """Autocorrelation-based pitch tracking for voiced frames."""
    pitches: list[float] = []
    if len(samples) < frame_len:
        return pitches
    n_frames = (len(samples) - frame_len) // hop
    for i in range(n_frames):
        frame = samples[i * hop: i * hop + frame_len]
        frame = frame - frame.mean()
        energy = np.sum(frame ** 2)
        if energy < 1e-4:
            continue
        corr = np.correlate(frame, frame, mode="full")[frame_len - 1:]
        corr = corr / max(corr[0], 1e-6)
        min_lag = int(sr / 400.0)
        max_lag = int(sr / 60.0)
        if max_lag >= len(corr):
            continue
        segment = corr[min_lag:max_lag]
        lag = int(np.argmax(segment)) + min_lag
        peak = segment[np.argmax(segment)]
        if peak > 0.3:
            pitches.append(sr / lag)
    return pitches


class VoiceDetector:
    """Real spectral + prosody analysis of a decoded audio signal."""

    model_version = "audio-v1"

    def __init__(self, spectrogram_dir: str | None = None) -> None:
        self.spectrogram_dir = spectrogram_dir

    async def analyze(self, audio_path: str) -> AudioResult:
        try:
            samples, sr = decode_wav(audio_path)
        except Exception as exc:
            raise exc
        if len(samples) == 0:
            raise ValueError("Audio file contains no samples.")

        db, freqs, _ = spectrogram_fn(samples, sr)
        feats = spectral_features(db, freqs, sr)
        pitches = estimate_pitch(samples, sr)

        # --- Spectral consistency: flatness and centroid stability ---
        spectral_score = float(min(0.95, max(0.0, (feats["spectral_flatness"] * 0.6 +
                                                   feats["spectral_rolloff"] / (sr / 2) * 0.4))))
        spectral_score = float(np.clip(spectral_score, 0.05, 0.95))

        # --- Prosody score: pitch distribution unnaturalness ---
        prosody_score = 0.15
        if pitches:
            p = np.asarray(pitches)
            pitch_range = (p.max() - p.min()) / max(p.mean(), 1e-6)
            jitter = float(np.std(np.diff(p)) / max(p.mean(), 1e-6))
            prosody_score = float(min(0.95, 0.2 + pitch_range * 0.1 + jitter * 0.4))

        # --- Pitch naturalness ---
        pitch_score = 0.15
        if pitches:
            p = np.asarray(pitches)
            mean_p = float(p.mean())
            if 70 < mean_p < 400:
                pitch_score = float(min(0.9, 0.3 + abs(mean_p - 150) / 250 * 0.4))

        # --- Vocoder artifacts: abrupt spectral discontinuities / notches ---
        vocoder_score = _vocoder_score(db)
        breath_noise = _breath_noise(samples)

        fused = float(np.clip(0.4 * spectral_score + 0.3 * prosody_score +
                              0.2 * pitch_score + 0.1 * vocoder_score, 0.05, 0.95))
        score = round(fused, 3)

        spectrogram_uri = None
        if self.spectrogram_dir:
            spectrogram_uri = self._save_spectrogram(samples, sr, audio_path)

        return AudioResult(
            score=score,
            model_version=self.model_version,
            spectral_score=round(spectral_score, 3),
            prosody_score=round(prosody_score, 3),
            pitch_score=round(pitch_score, 3),
            vocoder_artifacts=round(vocoder_score, 3),
            breath_noise=round(breath_noise, 3),
            segments=[],
            spectrogram_uri=spectrogram_uri,
            explanation=(
                "Spectral analysis found anomalies consistent with vocoder artifacts."
                if score > 0.5 else
                "Voice spectral and prosody features appear natural."
            ),
        )

    def _save_spectrogram(self, samples: np.ndarray, sr: int, audio_path: str) -> str:
        from PIL import Image

        mel = mel_spectrogram(samples, sr)
        norm = (mel - mel.min()) / max(mel.max() - mel.min(), 1e-6)
        img = Image.fromarray((norm * 255).astype(np.uint8)).resize((512, 256), Image.Resampling.LANCZOS)
        out_dir = Path(self.spectrogram_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"spectrogram-{Path(audio_path).stem}.png"
        img.save(out)
        return str(out)


def _vocoder_score(db: np.ndarray) -> float:
    if db.shape[0] < 3:
        return 0.1
    # Sudden energy notches across adjacent time frames indicate resynthesis.
    frame_energy = db.mean(axis=1)
    delta = np.abs(np.diff(frame_energy))
    notches = float((delta > np.percentile(delta, 90)).mean()) if delta.size else 0.0
    return float(np.clip(0.1 + notches * 0.9, 0.05, 0.9))


def _breath_noise(samples: np.ndarray) -> float:
    if len(samples) < 2048:
        return 0.1
    window = np.hanning(2048)
    n = len(samples) - 2048
    if n <= 0:
        return 0.1
    n_frames = max(1, min(50, n // 512))
    energies = []
    for i in range(n_frames):
        frame = samples[i * 512: i * 512 + 2048]
        if len(frame) < 2048:
            break
        energies.append(float(np.sum((frame * window) ** 2)))
    if not energies:
        return 0.1
    low_variance = float(np.std(energies) / max(np.mean(energies), 1e-6))
    return float(np.clip(0.1 + low_variance * 0.4, 0.05, 0.7))


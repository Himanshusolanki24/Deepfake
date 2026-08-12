from __future__ import annotations

from typing import Any

import numpy as np

from ...db.enums import MediaType, Severity, SignalStatus, SignalType
from ...forensic.interface import BaseDetector, DetectorContext
from ...forensic.signals import SignalResult


class SyntheticSpeechAbstractionAnalyzer(BaseDetector):
    """Abstraction-level detector for synthetic/TTS speech.

    Signal type: ``speech-synthetic``.

    Text-to-speech and voice-clone engines leave statistical fingerprints in
    the spectrogram: unusually flat spectra (vocoder smoothness), over-regular
    prosody (low pitch/energy variance) and reduced high-frequency breathiness.
    We measure those statistics directly; the result is a weak proxy, not a
    hard classifier, and limitations are attached to every output.

    The implementation is deliberately dependency-free (stdlib ``wave`` +
    NumPy) so it runs in constrained environments and stays deterministic.
    """

    name = "synthetic-speech-abstraction"
    family = "audio-abstraction"
    model_version = "speech-synthetic-v1"

    def supports(self, media_type: str) -> bool:
        return media_type == MediaType.audio.value or media_type == MediaType.video.value

    def base_limitations(self) -> list[str]:
        return [
            "Telephone-quality or encoded speech fools flatness metrics.",
            "High-quality neural TTS increasingly mimics natural prosody.",
        ]

    async def analyze(self, ctx: DetectorContext, **kwargs: Any) -> list[SignalResult]:
        samples, sr = _load_audio(ctx.media.path)
        if samples is None or sr is None:
            return [self.signal(
                signal_type=SignalType.speech_synthetic.value,
                score=None,
                confidence=None,
                severity=Severity.low.value,
                status=SignalStatus.insufficient_evidence.value,
                explanation="Audio could not be decoded for spectral analysis.",
            )]
        if samples.size < sr * 1:
            return [self.signal(
                signal_type=SignalType.speech_synthetic.value,
                score=None,
                confidence=None,
                severity=Severity.low.value,
                status=SignalStatus.insufficient_evidence.value,
                explanation="Audio too short for reliable spectral statistics.",
            )]

        frame_len = int(0.03 * sr)
        hop = int(0.02 * sr)

        spectral_flatness = _spectral_flatness(samples, sr, frame_len, hop)
        pitch_regularity = _pitch_regularity(samples, sr, frame_len, hop)
        energy_variance = _frame_energy_regularity(samples, sr, frame_len, hop)

        raw = 0.45 * spectral_flatness + 0.35 * pitch_regularity + 0.20 * energy_variance
        score = round(float(min(1.0, max(0.0, raw))), 3)
        confidence = round(float(min(0.85, 0.4 + 0.3 * (1.0 - abs(spectral_flatness - 0.45)))), 3)
        severity = Severity.high if score >= 0.7 else Severity.medium if score >= 0.4 else Severity.low

        details: dict[str, Any] = {
            "spectral_flatness": round(spectral_flatness, 3),
            "pitch_regularity": round(pitch_regularity, 3),
            "energy_regularity": round(energy_variance, 3),
            "duration_s": round(float(samples.size / sr), 2),
        }
        evidence: list[dict[str, Any]] = []
        if score >= 0.5:
            evidence.append({
                "kind": "spectral",
                "label": "Synthetic spectral signature",
                "value": score,
                "detail": "Flat spectrum and over-regular frame energy consistent with vocoder output.",
            })
        duration = float(samples.size / sr)
        if duration:
            evidence.append({
                "kind": "audio-anomaly",
                "label": "Analyzed speech segment",
                "timestamp_start": 0.0,
                "timestamp_end": round(duration, 2),
                "value": None,
                "detail": "Base statistics window for the synthetic-speech signal.",
            })

        explanation = (
            "Spectral statistics match synthetic-speech abstractions (flat spectrum, "
            "highly regular prosody)." if score >= 0.55 else
            "Spectral statistics are consistent with natural recorded speech."
        )
        return [self.signal(
            signal_type=SignalType.speech_synthetic.value,
            score=score,
            confidence=confidence,
            severity=severity.value,
            explanation=explanation,
            status=SignalStatus.available.value,
            details=details,
            evidence=evidence,
            supporting_details=[
                f"spectral_flatness={spectral_flatness:.2f}",
                f"pitch_regularity={pitch_regularity:.2f}",
            ],
        )]


def _load_audio(path: str) -> tuple[np.ndarray | None, int | None]:
    """Decode a PCM WAV via stdlib ``wave``; otherwise fall back to ffmpeg."""
    import subprocess
    import wave

    try:
        with wave.open(path, "rb") as wav:
            sr = wav.getframerate()
            if wav.getnchannels() > 1:
                raise ValueError("multi-channel wav")
            frames = wav.readframes(wav.getnframes())
            if wav.getsampwidth() == 2:
                samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            elif wav.getsampwidth() == 1:
                samples = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
            else:
                raise ValueError("unsupported sample width")
            return samples, sr
    except Exception:
        pass

    try:
        from ...utils.ffmpeg import FFMPEG_BIN

        if not FFMPEG_BIN:
            return None, None
        proc = subprocess.run(
            [FFMPEG_BIN, "-v", "quiet", "-i", path, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
            capture_output=True,
            timeout=30,
            check=True,
        )
        samples = np.frombuffer(proc.stdout, dtype=np.float32)
        return samples, 16000
    except Exception:
        return None, None


def _frames(samples: np.ndarray, frame_len: int, hop: int) -> list[np.ndarray]:
    frames: list[np.ndarray] = []
    total = samples.size
    for start in range(0, total - frame_len, hop):
        frames.append(samples[start:start + frame_len])
    return frames


def _spectral_flatness(samples: np.ndarray, sr: int, frame_len: int, hop: int) -> float:
    flatness: list[float] = []
    window = np.hanning(frame_len)
    for frame in _frames(samples, frame_len, hop):
        spectrum = np.abs(np.fft.rfft(frame * window)) + 1e-12
        log_mean = np.exp(np.mean(np.log(spectrum)))
        arith_mean = np.mean(spectrum)
        flatness.append(float(log_mean / arith_mean))
    if not flatness:
        return 0.5
    mean_flatness = float(np.mean(flatness))
    if not np.isfinite(mean_flatness):
        return 0.5
    # Real speech is non-flat (ratio well below 1); vocoder output is flatter.
    return float(min(1.0, max(0.0, mean_flatness * 6.0)))


def _pitch_regularity(samples: np.ndarray, sr: int, frame_len: int, hop: int) -> float:
    """Coefficient-of-variation of per-frame pitch via autocorrelation.

    Natural speech varies; TTS cadence is regular => lower CV => higher score.
    """
    f0s: list[float] = []
    min_lag = max(1, int(sr / 400))
    max_lag = int(sr / 80)
    for frame in _frames(samples, frame_len, hop):
        f0 = _autocorr_pitch(frame, min_lag, max_lag, sr)
        if f0 is not None:
            f0s.append(f0)
    if len(f0s) < 4:
        return 0.5
    arr = np.asarray(f0s)
    cv = float(np.std(arr) / np.mean(arr))
    return float(min(1.0, max(0.0, 1.0 - cv / 0.35)))


def _autocorr_pitch(frame: np.ndarray, min_lag: int, max_lag: int, sr: int) -> float | None:
    frame = frame - frame.mean()
    energy = np.sum(frame ** 2) or 1e-12
    if energy < 1e-6:
        return None
    r = np.correlate(frame, frame, mode="full")[frame.size - 1:]
    r = r / energy
    r = r[:max_lag + 1]
    r[:min_lag] = 0.0
    if r[max(min_lag, 0):].max() <= 0:
        return None
    lag = int(np.argmax(r))
    if lag < min_lag:
        return None
    return float(sr) / float(lag)


def _frame_energy_regularity(samples: np.ndarray, sr: int, frame_len: int, hop: int) -> float:
    """Silence/energy rhythm regularity: TTS sentence timing is metronomic."""
    energies: list[float] = []
    for frame in _frames(samples, frame_len, hop):
        energies.append(float(np.sqrt(np.mean(frame ** 2))))
    if len(energies) < 6:
        return 0.5
    arr = np.asarray(energies)
    active = arr[arr > 1e-3]
    if active.size < 4:
        return 0.5
    cv = float(np.std(active) / np.mean(active))
    return float(min(1.0, max(0.0, 1.0 - cv / 0.6)))
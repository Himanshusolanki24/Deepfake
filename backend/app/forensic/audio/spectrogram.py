from __future__ import annotations

from pathlib import Path

import numpy as np

from ...config import get_settings

settings = get_settings()


def decode_wav(path: str | Path, target_sr: int = 16000) -> tuple[np.ndarray, int]:
    """Decode a PCM WAV file to mono float samples at target_sr."""
    import wave

    with wave.open(str(path), "rb") as wf:
        sr = wf.getframerate()
        n = wf.getnframes()
        raw = wf.readframes(n)
        sample_width = wf.getsampwidth()
        channels = wf.getnchannels()

    dtype = {1: np.int8, 2: np.int16, 4: np.int32}.get(sample_width)
    if dtype is None:
        raise ValueError("Unsupported WAV sample width")
    samples = np.frombuffer(raw, dtype=dtype)
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    samples = samples.astype(np.float64) / (2 ** (8 * sample_width - 1))

    if sr != target_sr:
        samples = _resample(samples, sr, target_sr)
    return samples, target_sr


def _resample(x: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    n_out = int(len(x) * target_sr / orig_sr)
    x_old = np.linspace(0, 1, len(x))
    x_new = np.linspace(0, 1, n_out)
    return np.interp(x_new, x_old, x)


def spectrogram(samples: np.ndarray, sr: int, n_fft: int = 1024, hop: int = 256) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (stft_magnitude_db, freqs, times)."""
    if len(samples) < n_fft:
        samples = np.pad(samples, (0, n_fft - len(samples)))
    n_frames = 1 + (len(samples) - n_fft) // hop
    frames = np.stack([samples[i * hop: i * hop + n_fft] for i in range(n_frames)])
    window = np.hanning(n_fft)
    frames = frames * window
    spec = np.fft.rfft(frames, axis=1)
    mag = np.abs(spec)
    db = 20 * np.log10(mag + 1e-10)
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
    times = np.arange(n_frames) * hop / sr
    return db, freqs, times


def spectral_features(db: np.ndarray, freqs: np.ndarray, sr: int) -> dict[str, float]:
    """Aggregate spectral descriptors averaged over time."""
    power = 10 ** (db / 10.0)
    # Spectral centroid
    total = power.sum(axis=1, keepdims=True)
    total[total == 0] = 1
    centroid = (power * freqs[None, :]).sum(axis=1) / total[:, 0]
    # Spectral flatness (geometric vs arithmetic mean)
    flatness = np.exp(np.log(power + 1e-12).mean(axis=1)) / (power.mean(axis=1) + 1e-12)
    # Spectral rolloff
    cum = np.cumsum(power, axis=1)
    rolloff = np.array([
        freqs[np.searchsorted(cum[i], cum[i, -1] * 0.85)] if cum[i, -1] > 0 else 0.0
        for i in range(power.shape[0])
    ])
    return {
        "spectral_centroid": float(np.mean(centroid)),
        "spectral_flatness": float(np.mean(flatness)),
        "spectral_rolloff": float(np.mean(rolloff)),
    }


def mel_spectrogram(samples: np.ndarray, sr: int, n_mels: int = 64) -> np.ndarray:
    """Compute a log mel spectrogram using a simple mel filterbank."""
    n_fft = 1024
    db, freqs, _ = spectrogram(samples, sr, n_fft=n_fft)
    mel = _mel_filterbank(sr, n_fft, n_mels, freqs)
    mel_spec = db @ mel.T
    return mel_spec


def _mel_filterbank(sr: int, n_fft: int, n_mels: int, freqs: np.ndarray) -> np.ndarray:
    def hz_to_mel(h: float) -> float:
        return 2595.0 * np.log10(1.0 + h / 700.0)

    def mel_to_hz(m: float) -> float:
        return 700.0 * (10 ** (m / 2595.0) - 1.0)

    n_bins = len(freqs)
    mel_points = np.linspace(hz_to_mel(0.0), hz_to_mel(sr / 2), n_mels + 2)
    hz_points = np.array([mel_to_hz(m) for m in mel_points])
    filterbank = np.zeros((n_bins, n_mels))
    for i in range(n_mels):
        left, center, right = hz_points[i], hz_points[i + 1], hz_points[i + 2]
        for j, f in enumerate(freqs):
            if left < f < center:
                filterbank[j, i] = (f - left) / max(center - left, 1e-6)
            elif center <= f < right:
                filterbank[j, i] = (right - f) / max(right - center, 1e-6)
    return filterbank

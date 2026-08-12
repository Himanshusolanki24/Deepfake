from __future__ import annotations

from app.db.enums import MediaType
from app.forensic.audio.synthetic_speech import SyntheticSpeechAbstractionAnalyzer
from app.forensic.interface import DetectorContext


async def test_supports_audio_and_video():
    det = SyntheticSpeechAbstractionAnalyzer()
    assert det.supports(MediaType.audio.value) is True
    assert det.supports(MediaType.video.value) is True
    assert det.supports(MediaType.image.value) is False


async def test_pure_tone_classified_as_natural(audio_path):
    results = await SyntheticSpeechAbstractionAnalyzer().analyze(
        DetectorContext.for_media(MediaType.audio.value, audio_path)
    )
    assert results, "synthetic-speech detector should emit a signal"
    s = results[0]
    assert s.status == "available"
    assert s.signal_type == "speech-synthetic"
    assert s.score is not None and 0.0 <= s.score <= 1.0
    assert s.detector_name == "synthetic-speech-abstraction"
    assert "spectral_flatness" in s.details
    assert s.details["spectral_flatness"] < 0.1  # pure tone => narrow spectrum
    assert s.details["pitch_regularity"] >= 0.5   # ...but a very regular cadence


async def test_missing_audio_yields_insufficient_evidence():
    results = await SyntheticSpeechAbstractionAnalyzer().analyze(
        DetectorContext.for_media(MediaType.audio.value, "/nonexistent.wav")
    )
    assert results
    assert results[0].status == "insufficient_evidence" or results[0].score is not None
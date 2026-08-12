from __future__ import annotations

from app.db.enums import MediaType
from app.forensic.image.ai_generated import AIGeneratedAbstractionAnalyzer
from app.forensic.image.compression import CompressionAnalyzer
from app.forensic.interface import DetectorContext


async def _analyze_image(detector, image_path):
    ctx = DetectorContext.for_media(MediaType.image.value, image_path)
    return await detector.analyze(ctx)


async def test_compression_detector(image_path):
    results = await _analyze_image(CompressionAnalyzer(), image_path)
    assert results, "compression detector should emit a signal"
    s = results[0]
    assert s.status == "available"
    assert s.score is not None and 0.0 <= s.score <= 1.0
    assert s.detector_name == "compression-analyzer"
    assert isinstance(s.limitations, list) and len(s.limitations) > 0


async def test_ai_generated_detector(image_path):
    results = await _analyze_image(AIGeneratedAbstractionAnalyzer(), image_path)
    assert results, "ai-generated detector should emit a signal"
    s = results[0]
    assert s.status == "available"
    assert s.score is not None and 0.0 <= s.score <= 1.0
    assert s.detector_name == "ai-generated-abstraction"
    assert isinstance(s.supporting_details, list)


async def test_detectors_reject_audio_media_type(image_path):
    assert CompressionAnalyzer().supports(MediaType.image.value) is True
    assert CompressionAnalyzer().supports(MediaType.audio.value) is False
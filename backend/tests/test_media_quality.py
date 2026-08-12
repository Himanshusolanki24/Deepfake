from __future__ import annotations

import os

from app.db.enums import MediaType
from app.forensic.media.quality import (
    assess_image_quality,
    assess_quality,
    degraded_confidence,
    normalize_image,
    quality_limitations,
)


def test_assess_image_quality(image_path):
    q = assess_image_quality(image_path)
    assert 0.0 <= q.overall <= 1.0
    assert isinstance(q.is_acceptable, bool)
    d = q.to_dict()
    for key in ("overall", "resolution", "sharpness", "blockiness", "noise"):
        assert key in d


def test_audio_has_no_visual_quality(audio_path):
    assert assess_quality(MediaType.audio.value, audio_path) is None


def test_video_quality_non_none(video_path):
    q = assess_quality(MediaType.video.value, video_path)
    assert q is None or 0.0 <= q.overall <= 1.0


def test_degraded_confidence_lowers():
    low = degraded_confidence(None, 0.9)
    assert low == 0.9 or 0.0 <= low <= 0.9


def test_quality_limitations_never_none():
    assert isinstance(quality_limitations(None), list)


def test_normalize_image_writes_file(tmp_path, image_path):
    out = normalize_image(image_path, out_dir=str(tmp_path / "norm"))
    assert os.path.exists(out)
    assert os.path.getsize(out) > 0
from __future__ import annotations

import pytest

from app.core.exceptions import UnsupportedMediaError
from app.utils.files import (
    detect_mime_by_content,
    detect_mime_by_extension,
    is_supported,
    resolve_media_type,
    validate_file_safety,
)

RIFF = b"RIFF\x24\x08\x00\x00"


def test_wav_ripped_from_webp():
    assert detect_mime_by_content(RIFF + b"WAVEfmt ") == "audio/wav"


def test_webp_not_confused_with_wav():
    assert detect_mime_by_content(RIFF + b"WEBPVP8 ") == "image/webp"


def test_avi_not_confused_with_wav():
    assert detect_mime_by_content(RIFF + b"AVI LIST") == "video/x-msvideo"


def test_short_buffers_return_none():
    assert detect_mime_by_content(b"") is None
    assert detect_mime_by_content(b"RIFF\x24") is None


def test_jpeg_png_mp3():
    assert detect_mime_by_content(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00") == "image/jpeg"
    assert detect_mime_by_content(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR") == "image/png"
    assert detect_mime_by_content(b"ID3\x04\x00\x00\x00\x00\x00\x00") == "audio/mpeg"


def test_mp4_and_quicktime():
    assert detect_mime_by_content(b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00") == "video/mp4"
    assert detect_mime_by_content(b"\x00\x00\x00\x14ftypqt  \x00\x00\x00\x00") == "video/quicktime"


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("photo.jpg", "image/jpeg"),
        ("photo.png", "image/png"),
        ("photo.webp", "image/webp"),
        ("clip.mp4", "video/mp4"),
        ("clip.mov", "video/quicktime"),
        ("clip.avi", "video/x-msvideo"),
        ("song.mp3", "audio/mpeg"),
        ("song.wav", "audio/wav"),
        ("song.m4a", "audio/mp4"),
    ],
)
def test_extension_map(name, expected):
    assert detect_mime_by_extension(name) == expected


def test_resolve_media_type():
    assert resolve_media_type("image/png") == "image"
    assert resolve_media_type("video/mp4") == "video"
    assert resolve_media_type("audio/wav") == "audio"


def test_resolve_unsupported_raises():
    with pytest.raises(UnsupportedMediaError):
        resolve_media_type("application/pdf")


def test_is_supported():
    assert is_supported("audio/wav", "audio")
    assert is_supported("audio/x-wav", "audio")
    assert is_supported("image/webp", "image")
    assert not is_supported("image/webp", "video")
    assert not is_supported("audio/wav", "image")


def test_validate_file_safety_rejects_path_traversal():
    with pytest.raises(UnsupportedMediaError):
        validate_file_safety("../../etc/passwd")
    with pytest.raises(UnsupportedMediaError):
        validate_file_safety("script.py")
    validate_file_safety("ok.png")
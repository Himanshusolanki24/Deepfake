from __future__ import annotations

import os
from pathlib import Path

from ..core.exceptions import UnsupportedMediaError

MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF", b"WEBP"],
    "video/mp4": [b"\x00\x00\x00\x18ftyp", b"\x00\x00\x00\x20ftyp"],
    "video/quicktime": [b"\x00\x00\x00\x14ftypqt"],
    "video/x-msvideo": [b"RIFF", b"AVI "],
    "audio/mpeg": [b"\xff\xfb", b"\xff\xf3", b"\xff\xf2", b"ID3"],
    "audio/wav": [b"RIFF", b"WAVE"],
    "audio/mp4": [b"\x00\x00\x00\x18ftyp"],
}

EXTENSION_MAP: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".mov", ".avi"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a"}

MEDIA_TYPE_BY_EXT: dict[str, str] = {
    **{e: "image" for e in IMAGE_EXTS},
    **{e: "video" for e in VIDEO_EXTS},
    **{e: "audio" for e in AUDIO_EXTS},
}


def detect_mime_by_content(data: bytes) -> str | None:
    if len(data) < 16:
        return None
    for mime, sigs in MAGIC_SIGNATURES.items():
        for sig in sigs:
            if data.startswith(sig):
                return mime
    return None


def detect_mime_by_extension(filename: str) -> str | None:
    ext = Path(filename).suffix.lower()
    return EXTENSION_MAP.get(ext)


def resolve_media_type(mime: str) -> str:
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    raise UnsupportedMediaError(code="UNSUPPORTED_MEDIA", message=f"Unsupported MIME type: {mime}")


def is_supported(mime: str, media_type: str) -> bool:
    allowed = {
        "image": {"image/jpeg", "image/png", "image/webp"},
        "video": {"video/mp4", "video/quicktime", "video/x-msvideo"},
        "audio": {"audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"},
    }
    return mime in allowed.get(media_type, set())


def validate_file_safety(filename: str) -> None:
    """Reject path traversal and executable-looking names."""
    base = os.path.basename(filename)
    if base != filename or ".." in filename or filename.startswith("/"):
        raise UnsupportedMediaError(code="INVALID_FILENAME", message="Invalid filename.")
    ext = Path(filename).suffix.lower()
    if ext not in EXTENSION_MAP:
        raise UnsupportedMediaError(code="UNSUPPORTED_MEDIA", message="Unsupported file extension.")
    if ext in {".exe", ".sh", ".bat", ".dll", ".py", ".js"}:
        raise UnsupportedMediaError(code="UNSUPPORTED_MEDIA", message="Executable files are not allowed.")


def looks_like_media(data: bytes) -> bool:
    return detect_mime_by_content(data) is not None

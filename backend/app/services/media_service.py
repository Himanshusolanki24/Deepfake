from __future__ import annotations

import functools
import shutil
import struct
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path

from ..config import get_settings
from ..core.exceptions import (
    FileTooLargeError,
    InvalidMediaError,
    UnsupportedMediaError,
)
from ..db.enums import MediaType
from ..db.models import Analysis, MediaFile
from ..utils.files import (
    detect_mime_by_content,
    detect_mime_by_extension,
    resolve_media_type,
    validate_file_safety,
)
from ..utils.hashing import sha256_bytes
from .storage_service import StorageService

settings = get_settings()


class MediaService:
    def __init__(self, storage: StorageService) -> None:
        self.storage = storage

    def validate_upload(self, data: bytes, filename: str, declared_mime: str | None,
                        media_type: str) -> str:
        if len(data) > settings.max_upload_size_mb * 1024 * 1024:
            raise FileTooLargeError()
        validate_file_safety(filename)
        detected = detect_mime_by_content(data) or detect_mime_by_extension(filename)
        if detected is None:
            raise InvalidMediaError(message="Could not identify the file format.")
        if resolve_media_type(detected) != media_type:
            raise UnsupportedMediaError(message=f"File is {detected}, not {media_type}.")
        if declared_mime and detected != declared_mime and not (
            declared_mime == "audio/x-wav" and detected == "audio/wav"
        ):
            # Accept the mismatch only for aliased MIME types.
            declared_type = resolve_media_type(declared_mime)
            if declared_type != media_type:
                raise UnsupportedMediaError(message="Declared MIME type does not match file content.")
        return detected

    async def store_upload(self, analysis: Analysis, data: bytes, original_filename: str,
                           detected_mime: str) -> MediaFile:
        sha256 = sha256_bytes(data)
        ext = Path(original_filename).suffix.lower()
        key = f"originals/{analysis.id}{ext}"
        await self.storage.save(key, BytesIO(data))

        from ..core.security import generate_internal_filename

        internal_name = generate_internal_filename(ext)
        media = MediaFile(
            analysis_id=str(analysis.id),
            filename=internal_name,
            original_filename=original_filename,
            storage_key=key,
            mime_type=detected_mime,
            size_bytes=len(data),
            sha256=sha256,
            detected_media_type=resolve_media_type(detected_mime),
        )
        return media

    async def generate_placeholder(self, analysis: Analysis, media_type: str,
                                   filename: str | None) -> MediaFile:
        """Create a deterministic placeholder media file for metadata-only demo requests."""
        name = filename or f"demo.{'png' if media_type == 'image' else 'mp4' if media_type == 'video' else 'wav'}"
        if media_type == MediaType.image.value:
            data = _placeholder_png()
            mime = "image/png"
            ext = ".png"
            key = f"originals/{analysis.id}{ext}"
            await self.storage.save(key, BytesIO(data))
        elif media_type == MediaType.audio.value:
            data = _placeholder_wav()
            mime = "audio/wav"
            key = f"originals/{analysis.id}.wav"
            await self.storage.save(key, BytesIO(data))
        else:
            data = _placeholder_mp4()
            mime = "video/mp4"
            key = f"originals/{analysis.id}.mp4"
            await self.storage.save(key, BytesIO(data))

        return MediaFile(
            analysis_id=str(analysis.id),
            filename=key.rsplit("/", 1)[-1],
            original_filename=name,
            storage_key=key,
            mime_type=mime,
            size_bytes=len(data),
            sha256=sha256_bytes(data),
            detected_media_type=media_type,
        )

    async def load_for_analysis(self, analysis: Analysis) -> bytes:
        if not analysis.media:
            raise InvalidMediaError(message="No media file associated with this analysis.")
        return await self.storage.get(analysis.media.storage_key)


def _placeholder_png() -> bytes:
    """Small valid PNG (128x128 vertical gray gradient) generated without PIL."""
    import binascii
    import zlib

    width = height = 128
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    rows = bytearray()
    for y in range(height):
        rows.append(0)  # per-scanline filter byte (None)
        v = (y * 255) // (height - 1)
        rows += bytes((v, v, v)) * width
    raw = bytes(rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", binascii.crc32(c) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def _placeholder_wav() -> bytes:
    """1 second of 440Hz silence-ish tone at 16kHz mono 16-bit."""
    import math

    sr = 16000
    samples = bytearray()
    for i in range(sr):
        val = int(6000 * math.sin(2 * math.pi * 220 * i / sr))
        samples += struct.pack("<h", val)
    data_size = len(samples)
    header = b"RIFF" + struct.pack("<I", 36 + data_size) + b"WAVE"
    header += b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16)
    header += b"data" + struct.pack("<I", data_size)
    return header + bytes(samples)


@functools.lru_cache(maxsize=1)
def _placeholder_mp4() -> bytes:
    """A tiny real MP4 (h264, 1s @ 5fps, 320x180) so ffmpeg/opencv pipelines run in demo mode."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to generate placeholder video media.")
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            [
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "color=c=0x808080:s=320x180:d=1:r=5",
                "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", tmp_path,
            ],
            check=True,
            capture_output=True,
        )
        return Path(tmp_path).read_bytes()
    finally:
        Path(tmp_path).unlink(missing_ok=True)

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from ..core.exceptions import InvalidMediaError, ProcessingTimeoutError

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE_BIN = shutil.which("ffprobe") or "ffprobe"


@dataclass
class FFprobeResult:
    duration: float | None = None
    width: int | None = None
    height: int | None = None
    codec: str | None = None
    format_name: str | None = None
    bit_rate: int | None = None
    streams: list[dict] = field(default_factory=list)


def run_safe(cmd: list[str], timeout: int = 60, check: bool = True) -> subprocess.CompletedProcess:
    """Run a subprocess with an explicit argv list (never a shell string)."""
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=check)
        return proc
    except subprocess.TimeoutExpired as exc:
        raise ProcessingTimeoutError(message=f"Command timed out after {timeout}s: {cmd[0]}") from exc


def probe_media(path: str | Path) -> FFprobeResult:
    """Extract media metadata via ffprobe (argv-based, safe)."""
    cmd = [
        FFPROBE_BIN,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]
    proc = run_safe(cmd, timeout=30)
    if proc.returncode != 0:
        raise InvalidMediaError(message="Failed to probe media file. It may be corrupt.")
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise InvalidMediaError(message="ffprobe returned unparseable output.") from exc

    result = FFprobeResult()
    fmt = data.get("format", {})
    result.duration = _to_float(fmt.get("duration"))
    result.format_name = fmt.get("format_name")
    result.bit_rate = _to_int(fmt.get("bit_rate"))
    result.streams = data.get("streams", [])

    for stream in result.streams:
        codec_type = stream.get("codec_type")
        if codec_type in ("video", "audio"):
            result.codec = stream.get("codec_name", result.codec)
        if codec_type == "video":
            result.width = _to_int(stream.get("width"))
            result.height = _to_int(stream.get("height"))
            if result.duration is None:
                result.duration = _to_float(stream.get("duration"))
    return result


def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def extract_audio(video_path: str | Path, out_path: str | Path, timeout: int = 120) -> Path:
    """Extract audio track from a video into a WAV file."""
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        FFMPEG_BIN, "-y", "-v", "error",
        "-i", str(video_path),
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        str(out),
    ]
    proc = run_safe(cmd, timeout=timeout, check=False)
    if proc.returncode != 0 or not out.exists():
        raise InvalidMediaError(message="Failed to extract audio track from video.")
    return out


def extract_frames(video_path: str | Path, out_dir: str | Path, sample_fps: float = 2.0,
                   max_frames: int = 240, timeout: int = 180) -> list[tuple[int, float, Path]]:
    """Sample frames at sample_fps using ffmpeg; returns (frame_number, t_seconds, path)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = out_dir / "frame_%06d.jpg"
    cmd = [
        FFMPEG_BIN, "-y", "-v", "error",
        "-i", str(video_path),
        "-vf", f"fps={sample_fps},scale='min(720,iw)':-2",
        "-q:v", "3",
        "-frames:v", str(max_frames),
        str(pattern),
    ]
    proc = run_safe(cmd, timeout=timeout, check=False)
    if proc.returncode != 0:
        raise InvalidMediaError(message="Failed to extract frames from video.")

    frames: list[tuple[int, float, Path]] = []
    for p in sorted(out_dir.glob("frame_*.jpg")):
        try:
            num = int(p.stem.split("_")[1])
        except (IndexError, ValueError):
            continue
        t = (num - 1) / sample_fps
        frames.append((num, round(t, 3), p))
    if not frames:
        raise InvalidMediaError(message="No frames could be extracted from the video.")
    return frames


def get_video_duration(video_path: str | Path) -> float:
    return probe_media(video_path).duration or 0.0


def _to_float(value: object) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _to_int(value: object) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None

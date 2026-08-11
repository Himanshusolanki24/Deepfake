from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ...config import get_settings
from ...utils.ffmpeg import extract_frames

settings = get_settings()


@dataclass
class ExtractedFrame:
    frame_number: int
    timestamp: float
    path: Path


class FrameExtractor:
    def __init__(self, sample_fps: float | None = None, max_frames: int | None = None) -> None:
        self.sample_fps = sample_fps or settings.sample_fps
        self.max_frames = max_frames or settings.max_frames

    def extract(self, video_path: str, work_dir: str) -> list[ExtractedFrame]:
        frames = extract_frames(
            video_path,
            work_dir,
            sample_fps=self.sample_fps,
            max_frames=self.max_frames,
        )
        return [ExtractedFrame(num, t, p) for num, t, p in frames]

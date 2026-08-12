from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path

from ..utils.files import MEDIA_TYPE_BY_EXT

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".avi", ".mp3", ".wav", ".m4a"}


@dataclass
class LabeledSample:
    path: str
    label: bool  # True == fake/manipulated, False == authentic
    media_type: str
    source: str = "dir"


@dataclass
class EvaluationDataset:
    samples: list[LabeledSample] = field(default_factory=list)

    def media_types(self) -> list[str]:
        return sorted({s.media_type for s in self.samples})

    def counts(self) -> dict[str, int]:
        return {"real": sum(1 for s in self.samples if not s.label),
                "fake": sum(1 for s in self.samples if s.label)}

    @classmethod
    def from_dirs(cls, real_dir: str, fake_dir: str, media_type: str | None = None,
                  limit: int | None = None) -> EvaluationDataset:
        samples: list[LabeledSample] = []
        for base, label in ((real_dir, False), (fake_dir, True)):
            for p in sorted(Path(base).rglob("*")):
                if not p.is_file() or p.suffix.lower() not in SUPPORTED_EXTENSIONS:
                    continue
                mt = MEDIA_TYPE_BY_EXT.get(p.suffix.lower())
                if mt is None or (media_type and mt != media_type):
                    continue
                samples.append(LabeledSample(str(p), label, mt, source="dir"))
                if limit and len(samples) >= limit:
                    return cls(samples)
        return cls(samples)

    @classmethod
    def from_manifest(cls, path: str, media_type: str | None = None,
                      limit: int | None = None) -> EvaluationDataset:
        samples: list[LabeledSample] = []
        p = Path(path)
        rows = cls._read_rows(p)
        for row in rows:
            fpath = str(Path(row["path"]))
            mt = MEDIA_TYPE_BY_EXT.get(Path(fpath).suffix.lower(), "image")
            if media_type and mt != media_type:
                continue
            samples.append(LabeledSample(
                fpath, bool(int(row.get("label", 0))), mt, source="manifest",
            ))
            if limit and len(samples) >= limit:
                break
        return cls(samples)

    @staticmethod
    def _read_rows(p: Path) -> list[dict[str, str]]:
        if p.suffix.lower() == ".csv":
            with open(p, newline="", encoding="utf-8") as fh:
                return [dict(r) for r in csv.DictReader(fh)]
        if p.suffix.lower() == ".jsonl":
            rows = []
            with open(p, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        rows.append(json.loads(line))
            return rows
        raise ValueError(f"Unsupported manifest format: {p} (use .csv or .jsonl)")
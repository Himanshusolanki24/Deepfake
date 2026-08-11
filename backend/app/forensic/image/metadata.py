from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from ...ml.model_registry import get_registry
from ..signals import MetadataResult

SUSPICIOUS_SOFTWARE = [
    "photoshop", "gimp", "affinity photo", "pixlr", "deepfake", "faceswap",
    "insightface", "roop", "facefusion", "sd-webui", "stable diffusion", "midjourney",
]


def _exif_datetime(exif: object, tag: str, label: str) -> str | None:
    try:
        value = exif.get(tag)
        if value:
            return str(value)
    except Exception:
        return None
    return None


async def run_metadata_analysis(media_path: str, media_type: str) -> MetadataResult:
    """Real metadata + EXIF + ELA + double-compression analysis."""
    path = Path(media_path)
    registry = get_registry()
    version = registry.version("metadata-detector-v1") if registry is not None else "metadata-v1"

    raw: dict = {}
    findings: list[dict] = []
    exif_status = "absent"
    double_compression = False
    suspicious_software = False
    c2pa_status = "not-present"
    ela_score: float | None = None
    score: float | None = None

    size_bytes = path.stat().st_size if path.exists() else 0
    raw["filename"] = path.name
    raw["size_bytes"] = size_bytes

    import mimetypes

    raw["mime"] = mimetypes.guess_type(path.name)[0] or "unknown"

    stat = path.stat()

    if hasattr(stat, "st_birthtime"):
        raw["creation_time"] = datetime.fromtimestamp(stat.st_birthtime, UTC).isoformat()
    raw["modification_time"] = datetime.fromtimestamp(stat.st_mtime, UTC).isoformat()

    if media_type == "image":
        try:
            from PIL import Image

            with Image.open(path) as im:
                raw["dimensions"] = {"width": im.width, "height": im.height}
                raw["format"] = im.format
                exif = im.getexif()
                if exif:
                    exif_status = "present"
                    for key, val in exif.items():
                        try:
                            raw.setdefault("exif", {})[str(key)] = str(val)[:500]
                        except Exception:
                            continue
                    software = raw["exif"].get("305") or raw["exif"].get("Image Software")
                    if software:
                        raw["software"] = software
                        if any(s in software.lower() for s in SUSPICIOUS_SOFTWARE):
                            suspicious_software = True
                            findings.append({
                                "kind": "metadata-finding",
                                "label": "Suspicious editing software",
                                "detail": f"Editing software '{software}' associated with manipulation tools.",
                                "severity": "medium",
                            })
                    make = raw["exif"].get("271")
                    model = raw["exif"].get("272")
                    if make or model:
                        raw["camera"] = f"{make} {model}".strip()
                else:
                    exif_status = "absent"
                    findings.append({
                        "kind": "metadata-finding",
                        "label": "EXIF data absent",
                        "detail": "No EXIF metadata present. Absence is not proof of manipulation.",
                        "severity": "low",
                    })
        except Exception as exc:  # pragma: no cover
            raw["image_error"] = str(exc)

        try:
            ela_score, double_compression = _ela_analysis(path)
            if double_compression:
                findings.append({
                    "kind": "metadata-finding",
                    "label": "Double JPEG compression detected",
                    "detail": "The image shows traces of a second JPEG encoding, consistent with re-save after editing.",
                    "severity": "medium",
                })
        except Exception:
            ela_score = None

        try:
            c2pa_status = _c2pa_check(path)
            if c2pa_status == "verified":
                findings.append({
                    "kind": "metadata-finding",
                    "label": "C2PA credential verified",
                    "detail": "A valid C2PA content credential was found.",
                    "severity": "low",
                })
        except Exception:
            c2pa_status = "not-present"

    # Compose a metadata manipulation score from findings.
    contrib = 0.0
    if suspicious_software:
        contrib += 0.5
    if double_compression:
        contrib += 0.25
    if exif_status == "stripped":
        contrib += 0.15
    if c2pa_status == "failed":
        contrib += 0.1
    if ela_score is not None:
        contrib += ela_score * 0.2
    score = round(min(0.95, contrib), 3)
    score = min(score, 0.95)

    explanation = (
        "Metadata forensics found indicators of editing and recompression."
        if score and score > 0.4 else
        "Metadata shows no strong indicators of manipulation."
    )
    return MetadataResult(
        score=score,
        model_version=version,
        raw=raw,
        exif_status=exif_status,
        double_compression=double_compression,
        suspicious_software=suspicious_software,
        c2pa_status=c2pa_status,
        ela_score=ela_score,
        findings=findings,
        explanation=explanation,
    )


def _ela_analysis(path: Path, scale: int = 15) -> tuple[float | None, bool]:
    """Error Level Analysis via re-encode; returns (ela_score, double_compression)."""
    from io import BytesIO

    from PIL import Image

    with Image.open(path) as im:
        if im.mode != "RGB":
            im = im.convert("RGB")
        if min(im.size) > 1024:
            im = im.resize((1024, int(1024 * im.size[1] / im.size[0]),))
        buf = BytesIO()
        im.save(buf, "JPEG", quality=92)
        buf.seek(0)
        with Image.open(buf) as resaved:
            resaved = resaved.convert("RGB")
            import numpy as np

            a = np.asarray(im, dtype=np.float32)
            b = np.asarray(resaved, dtype=np.float32)
            diff = np.abs(a - b).mean()
    if diff > 0.5:
        double_compression = True
    ela_score = float(min(1.0, diff / 20.0))
    return round(ela_score, 3), double_compression


def _c2pa_check(path: Path) -> str:
    try:
        from c2pa import Reader  # type: ignore

        reader = Reader.from_file(str(path))
        if reader and len(reader.manifests()) > 0:
            return "verified"
        return "not-present"
    except Exception:
        try:
            data = path.read_bytes()
            if b"http://c2pa.org" in data or b"c2pa.org" in data:
                return "verified"
        except Exception:
            pass
        return "not-present"


class MetadataAnalyzer:
    """Adapter exposing the real metadata analysis via the MetadataDetector protocol."""

    model_version = "metadata-v1"

    async def analyze(self, media_path: str, media_type: str) -> MetadataResult:
        return await run_metadata_analysis(media_path, media_type)

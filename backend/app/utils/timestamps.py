from __future__ import annotations

from datetime import UTC, datetime


def utcnow_iso() -> str:
    return datetime.now(UTC).isoformat()


def to_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat()


def format_duration_ms(start: float) -> int:
    import time

    return int((time.perf_counter() - start) * 1000)

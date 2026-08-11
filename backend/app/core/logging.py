from __future__ import annotations

import json
import logging
import sys
import time
from contextvars import ContextVar
from typing import Any

from ..config import get_settings

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
analysis_id_var: ContextVar[str] = ContextVar("analysis_id", default="-")
user_id_var: ContextVar[str] = ContextVar("user_id", default="-")


class JsonFormatter(logging.Formatter):
    """Structured JSON log formatter for machine-parseable logs."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": request_id_var.get(),
            "analysis_id": analysis_id_var.get(),
            "user_id": user_id_var.get(),
        }
        if record.exc_info and record.exc_info[0]:
            payload["exc"] = self.formatException(record.exc_info)
        for key, value in getattr(record, "fields", {}).items():
            payload[key] = value
        return json.dumps(payload, default=str)


def setup_logging() -> None:
    settings = get_settings()
    handler: logging.Handler
    if settings.log_json:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
    else:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())
    logging.getLogger("uvicorn.access").disabled = True


def get_logger(name: str, **fields: Any) -> logging.Logger:
    logger = logging.getLogger(name)

    class _Logger(logging.LoggerAdapter):
        def process(self, msg: Any, kwargs: dict[str, Any]) -> tuple[Any, dict[str, Any]]:
            extra = dict(kwargs.get("extra", {}))
            merged = dict(fields)
            extra_fields = extra.get("fields", {})
            if isinstance(extra_fields, dict):
                merged.update(extra_fields)
            extra["fields"] = merged
            kwargs["extra"] = extra
            return msg, kwargs

    return _Logger(logger, {})  # type: ignore[return-value]


def log_with_fields(logger: logging.Logger, level: int, msg: str, **fields: Any) -> None:
    logger.log(level, msg, extra={"fields": fields})

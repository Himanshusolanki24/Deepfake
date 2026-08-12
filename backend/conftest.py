from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure the backend package is importable from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Test with SQLite in-memory unless DATABASE_URL is explicitly provided.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/authentiq_test.db")
os.environ.setdefault("USE_IN_PROCESS_TASKS", "true")
os.environ.setdefault("USE_MOCK_MODELS", "true")
os.environ.setdefault("STORAGE_PATH", "./storage-test")
os.environ.setdefault("LOG_JSON", "false")
os.environ.setdefault("METRICS_ENABLED", "true")

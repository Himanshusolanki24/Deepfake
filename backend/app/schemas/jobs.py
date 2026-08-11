from __future__ import annotations

from pydantic import BaseModel, Field


class ProgressEventOut(BaseModel):
    stage: str
    progress: int
    message: str | None = None


class JobOut(BaseModel):
    id: str
    analysis_id: str
    task_name: str
    queue: str
    status: str
    attempts: int = 0
    created_at: str | None = None
    finished_at: str | None = None


class ProgressState(BaseModel):
    analysis_id: str
    status: str
    current_stage: str | None = None
    progress: int = 0
    events: list[ProgressEventOut] = Field(default_factory=list)

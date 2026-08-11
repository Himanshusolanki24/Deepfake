from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import TimestampMixin, UUIDPrimaryKeyMixin
from ..database import Base


class AnalysisJob(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "analysis_jobs"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    task_name: Mapped[str] = mapped_column(String(64), nullable=False)
    queue: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True, nullable=False)
    celery_task_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    worker: Mapped[str | None] = mapped_column(String(128), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    analysis = relationship("Analysis", back_populates="jobs")


class ProgressEvent(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "progress_events"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    stage: Mapped[str] = mapped_column(String(64), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis = relationship("Analysis", back_populates="progress_events")

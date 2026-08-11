from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import TimestampMixin, UUIDPrimaryKeyMixin
from ..database import Base


class Report(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "reports"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    format: Mapped[str] = mapped_column(String(16), default="html", nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    analysis = relationship("Analysis", back_populates="report")

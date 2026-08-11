from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import TimestampMixin, UUIDPrimaryKeyMixin
from ..database import Base


class Evidence(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "evidence"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    signal_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp_start: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp_end: Mapped[float | None] = mapped_column(Float, nullable=True)
    frame_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    artifact_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column("metadata", Text, nullable=True)  # JSON

    analysis = relationship("Analysis", back_populates="evidence")

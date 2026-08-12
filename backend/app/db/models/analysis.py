from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import TimestampMixin, UUIDPrimaryKeyMixin
from ..database import Base
from ..enums import AnalysisStatus, MediaType, Verdict


class Analysis(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "analyses"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    owner_id: Mapped[str] = mapped_column(String(64), default="anonymous", index=True, nullable=False)
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, native_enum=False), index=True, nullable=False
    )
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, native_enum=False), default=AnalysisStatus.created, index=True, nullable=False
    )
    verdict: Mapped[Verdict | None] = mapped_column(
        Enum(Verdict, native_enum=False), index=True, nullable=True
    )

    calibrated_probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    ci_lower: Mapped[float | None] = mapped_column(Float, nullable=True)
    ci_upper: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    media_sha256: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    model_set: Mapped[str | None] = mapped_column(String(255), nullable=True)

    total_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)

    media_quality_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    cross_modal_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    uncertainty: Mapped[float | None] = mapped_column(Float, nullable=True)
    agreement_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    engine_version: Mapped[str | None] = mapped_column(String(32), nullable=True)

    user = relationship("User", back_populates="analyses")
    media = relationship("MediaFile", back_populates="analysis", uselist=False, lazy="selectin",
                         cascade="all, delete-orphan")
    jobs = relationship("AnalysisJob", back_populates="analysis", lazy="selectin",
                        cascade="all, delete-orphan")
    signals = relationship("SignalResult", back_populates="analysis", lazy="selectin",
                           cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="analysis", lazy="selectin",
                            cascade="all, delete-orphan")
    suspicious_frames = relationship("SuspiciousFrame", back_populates="analysis", lazy="selectin",
                                     cascade="all, delete-orphan")
    metadata_record = relationship("MetadataRecord", back_populates="analysis", uselist=False,
                                   lazy="selectin", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="analysis", uselist=False, lazy="selectin",
                          cascade="all, delete-orphan")
    progress_events = relationship("ProgressEvent", back_populates="analysis", lazy="selectin",
                                   cascade="all, delete-orphan")


class MediaFile(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "media_files"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    codec: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detected_media_type: Mapped[str] = mapped_column(String(16), nullable=False)

    analysis = relationship("Analysis", back_populates="media")


class SignalResult(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "signal_results"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    signal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="available", nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    detector_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON blob
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list
    supporting_details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list

    analysis = relationship("Analysis", back_populates="signals")


class SuspiciousFrame(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "suspicious_frames"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    frame_number: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[float] = mapped_column(Float, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    analysis = relationship("Analysis", back_populates="suspicious_frames")


class MetadataRecord(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "metadata_records"

    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    raw: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    exif_status: Mapped[str] = mapped_column(String(16), default="absent", nullable=False)
    double_compression: Mapped[bool] = mapped_column(default=False, nullable=False)
    suspicious_software: Mapped[bool] = mapped_column(default=False, nullable=False)
    c2pa_status: Mapped[str] = mapped_column(String(16), default="not-present", nullable=False)
    ela_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    analysis = relationship("Analysis", back_populates="metadata_record")

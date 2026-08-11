from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class MediaUploadRequest(BaseModel):
    media_type: str
    filename: str | None = None
    size: int | None = None
    mime_type: str | None = None
    signals: list[str] = Field(default_factory=list)
    metadata_only: bool = Field(default=False, description="True when the client sends JSON metadata without a file.")

    @field_validator("media_type")
    @classmethod
    def _validate_media_type(cls, v: str) -> str:
        if v not in ("image", "video", "audio"):
            raise ValueError("media_type must be one of: image, video, audio")
        return v


class MediaUploadResponse(BaseModel):
    id: str
    media_type: str
    status: str
    media_sha256: str | None = None
    uploaded: bool = False

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiErrorSchema(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ApiEnvelope(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: ApiErrorSchema | None = None
    request_id: str | None = Field(default=None, alias="requestId")


class OkResponse(BaseModel):
    success: bool = True
    data: dict[str, Any] = Field(default_factory=dict)
    error: None = None

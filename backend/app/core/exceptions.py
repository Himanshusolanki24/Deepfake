from __future__ import annotations

from typing import Any


class AuthentiqError(Exception):
    """Base application error."""

    status_code = 500
    code = "INTERNAL_ERROR"
    message = "An internal error occurred."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: dict[str, Any] | None = None,
        status_code: int | None = None,
    ) -> None:
        self.message = message or self.message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class InvalidMediaError(AuthentiqError):
    status_code = 400
    code = "INVALID_MEDIA"
    message = "The uploaded media is invalid."


class UnsupportedMediaError(AuthentiqError):
    status_code = 415
    code = "UNSUPPORTED_MEDIA"
    message = "The uploaded file type is not supported."


class FileTooLargeError(AuthentiqError):
    status_code = 413
    code = "FILE_TOO_LARGE"
    message = "The uploaded file exceeds the maximum allowed size."


class AnalysisNotFoundError(AuthentiqError):
    status_code = 404
    code = "ANALYSIS_NOT_FOUND"
    message = "Analysis not found."


class ModelInferenceError(AuthentiqError):
    status_code = 500
    code = "MODEL_INFERENCE_ERROR"
    message = "Model inference failed."


class ProcessingTimeoutError(AuthentiqError):
    status_code = 504
    code = "PROCESSING_TIMEOUT"
    message = "Processing exceeded the maximum allowed time."


class StorageError(AuthentiqError):
    status_code = 500
    code = "STORAGE_ERROR"
    message = "Storage operation failed."


class ReportGenerationError(AuthentiqError):
    status_code = 500
    code = "REPORT_GENERATION_ERROR"
    message = "Failed to generate the forensic report."


class InvalidStateTransitionError(AuthentiqError):
    status_code = 409
    code = "INVALID_STATE_TRANSITION"
    message = "The requested state transition is not allowed."


class AuthenticationError(AuthentiqError):
    status_code = 401
    code = "UNAUTHENTICATED"
    message = "Authentication required."


class AuthorizationError(AuthentiqError):
    status_code = 403
    code = "FORBIDDEN"
    message = "You do not have permission to access this resource."


class RateLimitExceededError(AuthentiqError):
    status_code = 429
    code = "RATE_LIMITED"
    message = "Rate limit exceeded. Please retry later."


class IdempotencyConflictError(AuthentiqError):
    status_code = 409
    code = "IDEMPOTENCY_CONFLICT"
    message = "A request with this idempotency key already exists."


class ModelNotFoundError(AuthentiqError):
    status_code = 500
    code = "MODEL_NOT_FOUND"
    message = "The requested model is not available in the registry."


class ModelNotLoadedError(AuthentiqError):
    status_code = 500
    code = "MODEL_NOT_LOADED"
    message = "The requested model could not be loaded."

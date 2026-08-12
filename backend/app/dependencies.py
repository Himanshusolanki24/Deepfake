from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    IdempotencyConflictError,
    RateLimitExceededError,
)
from .core.security import decode_token, hash_api_key
from .core.supabase_auth import decode_supabase_token, is_supabase_token
from .db.database import get_db_session
from .db.enums import Role
from .db.models import ApiKey, User

settings = get_settings()


@dataclass
class Principal:
    subject: str
    role: Role = Role.user
    auth_method: str = "jwt"
    anonymous: bool = True
    claims: dict[str, Any] = field(default_factory=dict)

    @property
    def owner_id(self) -> str:
        return f"{self.auth_method}:{self.subject}"


def _principal_from_user(user: User, auth_method: str = "jwt") -> Principal:
    return Principal(subject=str(user.id), role=user.role, auth_method=auth_method, anonymous=False)


def _principal_from_supabase(sub: str, claims: dict[str, Any]) -> Principal:
    """Derive a principal from a validated Supabase JWT.

    The authenticated user identity always comes from the token (``sub``) —
    never from a client-sent ``user_id``.
    """
    role = Role.user
    app_role = (claims.get("app_metadata") or {}).get("role")
    if app_role in {r.value for r in Role}:
        role = Role(app_role)
    return Principal(
        subject=sub,
        role=role,
        auth_method="supabase",
        anonymous=False,
        claims=claims,
    )


async def get_current_user(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    session: AsyncSession = Depends(get_db_session),
) -> Principal:
    if x_api_key:
        principal = await _authenticate_api_key(session, x_api_key)
        if principal is not None:
            return principal
        raise AuthenticationError(message="Invalid API key.")
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        # Prefer Supabase identity when configured.
        if not settings.use_supabase_auth or not is_supabase_token(token):
            try:
                claims = decode_token(token)
            except Exception as exc:
                raise AuthenticationError(message="Invalid or expired token.") from exc
            user = await session.get(User, claims.get("sub"))
            if user is None or not user.is_active:
                raise AuthenticationError(message="User not found or inactive.")
            return _principal_from_user(user)
        try:
            claims = decode_supabase_token(token)
        except AuthenticationError:
            # Fall back to the legacy local JWT scheme for backwards compat.
            try:
                local_claims = decode_token(token)
            except Exception as exc:
                raise AuthenticationError(message="Invalid or expired token.") from exc
            user = await session.get(User, local_claims.get("sub"))
            if user is None or not user.is_active:
                raise AuthenticationError(message="User not found or inactive.")
            return _principal_from_user(user)
        return _principal_from_supabase(claims["sub"], claims)
    raise AuthenticationError(message="Authentication required.")


async def get_optional_user(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    session: AsyncSession = Depends(get_db_session),
) -> Principal:
    try:
        return await get_current_user(authorization, x_api_key, session)
    except AuthenticationError:
        return Principal(subject="anonymous", auth_method="anonymous")


async def _authenticate_api_key(session: AsyncSession, raw_key: str) -> Principal | None:
    key_hash = hash_api_key(raw_key)
    row = await session.scalar(select(ApiKey).where(ApiKey.key_hash == key_hash))
    if row is None or not row.is_active:
        return None
    if row.expires_at is not None and row.expires_at.timestamp() < time.time():
        return None
    row.last_used_at = datetime.now(UTC)
    await session.commit()
    user = await session.get(User, row.user_id)
    if user is None:
        return None
    return _principal_from_user(user, auth_method="api_key")


def require_roles(*roles: Role):
    async def _dependency(principal: Principal = Depends(get_current_user)) -> Principal:
        if principal.anonymous or principal.role not in roles:
            raise AuthorizationError()
        return principal

    return _dependency


# ------------------------------------------------------------ rate limiting
class _InMemoryLimiter:
    """Sliding-window limiter used when Redis is unavailable."""

    def __init__(self) -> None:
        self._events: dict[str, list[float]] = {}

    def check(self, key: str, limit: int, window: float = 3600.0) -> bool:
        now = time.monotonic()
        events = [t for t in self._events.get(key, []) if now - t < window]
        if len(events) >= limit:
            self._events[key] = events
            return False
        events.append(now)
        self._events[key] = events
        return True


_in_memory_limiter = _InMemoryLimiter()


async def check_rate_limit(request: Request, principal: Principal) -> None:
    if principal.auth_method == "api_key":
        limit = settings.rate_limit_api_per_hour
    elif not principal.anonymous:
        limit = settings.rate_limit_authenticated_per_hour
    else:
        limit = settings.rate_limit_anonymous_per_hour
    client = request.client.host if request.client else "unknown"
    key = f"rl:{principal.auth_method}:{principal.subject if not principal.anonymous else client}:{request.url.path}"

    try:
        import redis.asyncio as aioredis

        redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 3600)
        await redis.close()
        if count > limit:
            raise RateLimitExceededError()
    except RateLimitExceededError:
        raise
    except Exception:
        if not _in_memory_limiter.check(key, limit, 3600.0):
            raise RateLimitExceededError()


async def get_rate_limit_dependency(
    request: Request, principal: Principal = Depends(get_optional_user)
) -> Principal:
    await check_rate_limit(request, principal)
    return principal


# ------------------------------------------------------------ idempotency
async def validate_idempotency_key(idempotency_key: str | None = None) -> str | None:
    if idempotency_key is None:
        return None
    if not (4 <= len(idempotency_key) <= 128):
        raise IdempotencyConflictError(message="Invalid idempotency key.")
    return idempotency_key

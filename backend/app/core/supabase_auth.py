"""Supabase JWT validation.

The FastAPI backend never trusts a ``user_id`` sent in a request body. Instead it
validates the Supabase access token presented as ``Authorization: Bearer <jwt>``
and derives the authenticated user identity from the token claims.

The Supabase local JWT secret (default:
``super-secret-jwt-token-with-at-least-32-characters-long``) is shared with the
local Supabase instance. For hosted projects it can be retrieved from the
Supabase dashboard (Project Settings -> API).
"""

from __future__ import annotations

import time
from typing import Any

import jwt as pyjwt

from .exceptions import AuthenticationError
from ..config import get_settings

settings = get_settings()


def decode_supabase_token(token: str) -> dict[str, Any]:
    """Validate a Supabase access token and return its claims."""
    secret = settings.supabase_jwt_secret
    try:
        claims = pyjwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_aud": False,  # audience checked manually below
                "verify_exp": True,
            },
        )
    except pyjwt.ExpiredSignatureError as exc:
        raise AuthenticationError(message="Session expired. Please sign in again.") from exc
    except pyjwt.InvalidTokenError as exc:
        raise AuthenticationError(message="Invalid or expired token.") from exc

    # Typical Supabase access tokens carry: iss, sub, aud, role, iat, exp.
    sub = claims.get("sub")
    if not sub or sub == "00000000-0000-0000-0000-000000000000":
        raise AuthenticationError(message="Invalid token subject.")

    if settings.supabase_jwt_audience:
        aud = claims.get("aud")
        if aud != settings.supabase_jwt_audience:
            raise AuthenticationError(message="Token audience mismatch.")

    if claims.get("role") == "service_role":
        raise AuthenticationError(message="Service role tokens are not accepted from clients.")

    return claims


def is_supabase_token(token: str) -> bool:
    """Heuristic used before signature validation to pick the token decoder."""
    try:
        unverified = pyjwt.decode(token, options={"verify_signature": False})
    except pyjwt.InvalidTokenError:
        return False
    return bool(unverified.get("sub")) and bool(unverified.get("aud")) and "role" in unverified
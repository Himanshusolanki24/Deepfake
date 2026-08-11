from __future__ import annotations

import hashlib
import hmac
import secrets
import time
import uuid
from typing import Any

import jwt as pyjwt
from pydantic import BaseModel

from ..config import get_settings

try:  # optional dependency
    import bcrypt

    _HAS_BCRYPT = True
except Exception:  # pragma: no cover
    _HAS_BCRYPT = False

settings = get_settings()


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int


def hash_password(password: str) -> str:
    if _HAS_BCRYPT:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=settings.password_hash_rounds)).decode()
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith("scrypt$"):
        try:
            _, salt_hex, derived_hex = password_hash.split("$")
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(derived_hex)
            derived = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
            return hmac.compare_digest(derived, expected)
        except Exception:
            return False
    if _HAS_BCRYPT:
        try:
            return bcrypt.checkpw(password.encode(), password_hash.encode())
        except Exception:
            return False
    return False


def _create_token(subject: str, token_type: str, ttl_seconds: int, claims: dict[str, Any] | None = None) -> str:
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + ttl_seconds,
        "jti": uuid.uuid4().hex,
    }
    if claims:
        payload.update(claims)
    return pyjwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str, **claims: Any) -> str:
    return _create_token(subject, "access", settings.jwt_access_ttl_minutes * 60, claims)


def create_refresh_token(subject: str) -> str:
    return _create_token(subject, "refresh", settings.jwt_refresh_ttl_days * 86400)


def decode_token(token: str) -> dict[str, Any]:
    return pyjwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def generate_api_key() -> str:
    return f"ak_{secrets.token_urlsafe(32)}"


def generate_internal_filename(ext: str) -> str:
    return f"{uuid.uuid4().hex}{ext.lower()}"

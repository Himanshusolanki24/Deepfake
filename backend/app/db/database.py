from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from ..config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    pass


def _engine_kwargs(url: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {"echo": settings.db_echo, "pool_pre_ping": True}
    if url.startswith("postgresql"):
        kwargs.update(pool_size=settings.db_pool_size, max_overflow=settings.db_max_overflow)
    return kwargs


engine = create_async_engine(settings.database_url, **_engine_kwargs(settings.database_url))


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_connection: Any, _: Any) -> None:
    """Enable WAL + FK enforcement for SQLite so dev/tests behave like Postgres."""
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def init_db() -> None:
    """Create tables. Production deployments should use Alembic migrations."""
    from ..db import models  # noqa: F401 - register models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_engine() -> None:
    await engine.dispose()

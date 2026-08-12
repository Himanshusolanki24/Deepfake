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
    """Create tables and apply lightweight additive migrations.

    Production deployments should use Alembic migrations; this helper keeps
    disposable dev/test databases in sync with schema additions without
    dropping data.
    """
    from ..db import models  # noqa: F401 - register models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if settings.database_url.startswith("sqlite"):
            await _ensure_sqlite_columns(conn)
        else:
            await _ensure_pg_columns(conn)


_ADDITIVE_COLUMNS: dict[str, dict[str, str]] = {
    "analyses": {
        "media_quality_json": "TEXT",
        "cross_modal_json": "TEXT",
        "uncertainty": "FLOAT",
        "agreement_score": "FLOAT",
        "engine_version": "VARCHAR(32)",
    },
    "signal_results": {
        "detector_name": "VARCHAR(64)",
        "limitations": "TEXT",
        "supporting_details": "TEXT",
    },
}


async def _ensure_sqlite_columns(conn: Any) -> None:
    for table, columns in _ADDITIVE_COLUMNS.items():
        present = {
            row[1]
            for row in (
                (await conn.exec_driver_sql(f"PRAGMA table_info({table})")).fetchall()
            )
        }
        if not present:
            continue
        for name, ddl in columns.items():
            if name not in present:
                await conn.exec_driver_sql(
                    f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"
                )


async def _ensure_pg_columns(conn: Any) -> None:
    for table, columns in _ADDITIVE_COLUMNS.items():
        for name, ddl in columns.items():
            await conn.exec_driver_sql(
                f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {name} {ddl}"
            )


async def dispose_engine() -> None:
    await engine.dispose()

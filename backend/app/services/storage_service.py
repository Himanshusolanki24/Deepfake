from __future__ import annotations

import os
from pathlib import Path
from typing import BinaryIO, Protocol

from ..config import get_settings

settings = get_settings()


class StorageBackend(Protocol):
    async def save(self, key: str, fileobj: BinaryIO) -> int: ...
    async def get_bytes(self, key: str) -> bytes: ...
    async def delete(self, key: str) -> None: ...
    async def exists(self, key: str) -> bool: ...
    def generate_url(self, key: str, expires: int = 3600) -> str: ...


class LocalStorage:
    """Filesystem-backed storage rooted at STORAGE_PATH."""

    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Invalid storage key: path traversal detected")
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    async def save(self, key: str, fileobj: BinaryIO) -> int:
        path = self._resolve(key)
        with open(path, "wb") as out:
            size = 0
            while True:
                chunk = fileobj.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
                size += len(chunk)
        return size

    async def get_bytes(self, key: str) -> bytes:
        path = self._resolve(key)
        if not path.exists():
            raise FileNotFoundError(key)
        return path.read_bytes()

    async def delete(self, key: str) -> None:
        path = self._resolve(key)
        if path.exists():
            path.unlink()

    async def exists(self, key: str) -> bool:
        path = self._resolve(key)
        return path.exists()

    def generate_url(self, key: str, expires: int = 3600) -> str:
        base = settings.public_base_url.rstrip("/")
        return f"{base}/media/{key}"


class S3Storage:
    """S3-compatible object storage (boto3 optional dependency)."""

    def __init__(self, bucket: str, **kwargs: object) -> None:
        import boto3

        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=kwargs.get("endpoint_url"),
            region_name=kwargs.get("region_name", "us-east-1"),
            aws_access_key_id=kwargs.get("access_key"),
            aws_secret_access_key=kwargs.get("secret_key"),
        )

    async def save(self, key: str, fileobj: BinaryIO) -> int:
        import asyncio

        def _do() -> int:
            size = fileobj.seek(0, os.SEEK_END)
            fileobj.seek(0)
            self.client.upload_fileobj(fileobj, self.bucket, key)
            return size

        return await asyncio.to_thread(_do)

    async def get_bytes(self, key: str) -> bytes:
        import asyncio

        return await asyncio.to_thread(self.client.get_object, Bucket=self.bucket, Key=key)

    async def delete(self, key: str) -> None:
        import asyncio

        await asyncio.to_thread(self.client.delete_object, Bucket=self.bucket, Key=key)

    async def exists(self, key: str) -> bool:
        import asyncio

        try:
            await asyncio.to_thread(self.client.head_object, Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False

    def generate_url(self, key: str, expires: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires
        )


class StorageService:
    """Higher-level storage facade used by services."""

    def __init__(self, backend: StorageBackend) -> None:
        self._backend = backend

    async def save(self, key: str, fileobj: BinaryIO) -> int:
        return await self._backend.save(key, fileobj)

    async def save_bytes(self, key: str, data: bytes) -> int:
        from io import BytesIO

        return await self._backend.save(key, BytesIO(data))

    async def get(self, key: str) -> bytes:
        return await self._backend.get_bytes(key)

    async def delete(self, key: str) -> None:
        await self._backend.delete(key)

    def url(self, key: str) -> str:
        return self._backend.generate_url(key)

    @classmethod
    def from_settings(cls) -> StorageService:
        if settings.storage_type == "s3":
            backend: StorageBackend = S3Storage(
                settings.s3_bucket,
                endpoint_url=settings.s3_endpoint_url,
                region_name=settings.s3_region,
                access_key=settings.s3_access_key,
                secret_key=settings.s3_secret_key,
            )
        else:
            backend = LocalStorage(settings.storage_path)
        return cls(backend)

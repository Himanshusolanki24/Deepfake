from __future__ import annotations

import hashlib
from typing import BinaryIO


def sha256_file(fileobj: BinaryIO, chunk_size: int = 1024 * 1024) -> str:
    hasher = hashlib.sha256()
    while True:
        chunk = fileobj.read(chunk_size)
        if not chunk:
            break
        hasher.update(chunk)
    fileobj.seek(0)
    return hasher.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_stream(files: list[BinaryIO]) -> str:
    hasher = hashlib.sha256()
    for f in files:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            hasher.update(chunk)
        f.seek(0)
    return hasher.hexdigest()

from __future__ import annotations

from fastapi import APIRouter

from . import analysis, health, upload, websocket

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(upload.router)
api_router.include_router(analysis.router)
api_router.include_router(websocket.router)

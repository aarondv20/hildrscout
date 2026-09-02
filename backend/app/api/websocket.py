from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, job_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[job_id] = websocket

    def disconnect(self, job_id: str) -> None:
        self._connections.pop(job_id, None)

    async def send(self, job_id: str, event: str, data: dict) -> None:
        ws = self._connections.get(job_id)
        if ws is None:
            return
        try:
            await ws.send_json({"event": event, "data": data})
        except Exception:
            logger.warning("WebSocket send failed for job %s (dropping)", job_id, exc_info=True)
            self.disconnect(job_id)

    async def broadcast(self, event: str, data: dict) -> None:
        for job_id in list(self._connections.keys()):
            await self.send(job_id, event, data)


manager = ConnectionManager()

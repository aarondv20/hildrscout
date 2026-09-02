from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.websocket import manager

logger = logging.getLogger("main")


async def _verify_chromium() -> bool:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        await browser.close()
    return True


async def _install_chromium() -> bool:
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "playwright",
        "install",
        "chromium",
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    return proc.returncode == 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Hildr Scout API starting...")
    try:
        await _verify_chromium()
        logger.info("Playwright Chromium is installed and launchable")
    except Exception as exc:
        logger.warning("Chromium launch failed (%s); installing browsers...", exc)
        if await _install_chromium():
            try:
                await _verify_chromium()
                logger.info("Playwright Chromium installed and ready")
            except Exception as exc2:
                logger.warning("Chromium still unavailable: %s", exc2)
        else:
            logger.warning("Playwright install failed; run: playwright install chromium")
    yield
    logger.info("Hildr Scout API shutting down...")


app = FastAPI(title="Hildr Scout API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await manager.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(job_id)


@app.get("/health")
async def health():
    return {"status": "ok"}

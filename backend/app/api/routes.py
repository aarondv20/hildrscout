from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse

from app.api.websocket import manager
from app.export.excel import build_filename, export_to_csv, export_to_excel, export_to_json
from app.models.business import Business, JobStatus, SearchRequest
from app.scraper.maps import scrape_google_maps
from app.scraper.website import scrape_website
from app.utils.logger import WebSocketLogHandler, get_logger
from app.utils.regex import classify_url

logger = get_logger("routes")

router = APIRouter()

# job_id -> JobStatus
_JOBS: dict[str, JobStatus] = {}
_STOP_FLAGS: dict[str, bool] = {}
_OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs")


@router.post("/search")
async def start_search(request: SearchRequest):
    job_id = str(uuid4())
    _STOP_FLAGS[job_id] = False
    _JOBS[job_id] = JobStatus(
        job_id=job_id,
        status="running",
        total=request.max_results,
    )
    asyncio.create_task(run_pipeline(job_id, request))
    return {"job_id": job_id, "status": "started"}


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = _JOBS.get(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return job.model_dump()


@router.get("/leads/{job_id}")
async def get_leads(job_id: str):
    job = _JOBS.get(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    return job.leads


@router.get("/export/{job_id}")
async def export_leads(job_id: str, format: str = Query("excel", pattern="^(excel|csv|json)$")):
    job = _JOBS.get(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    if not job.leads:
        raise HTTPException(400, "No leads to export")

    os.makedirs(_OUTPUT_DIR, exist_ok=True)
    filename = build_filename(job_id, format)
    filepath = os.path.join(_OUTPUT_DIR, filename)

    if format == "csv":
        export_to_csv(job.leads, filepath)
    elif format == "json":
        export_to_json(job.leads, filepath)
    else:
        export_to_excel(job.leads, filepath)

    media = {
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv",
        "json": "application/json",
    }[format]
    await manager.send(job_id, "export_completed", {"format": format, "filename": filename})
    return FileResponse(filepath, media_type=media, filename=filename)


@router.delete("/stop/{job_id}")
async def stop_job(job_id: str):
    if job_id not in _JOBS:
        raise HTTPException(404, "Job not found")
    _STOP_FLAGS[job_id] = True
    job = _JOBS[job_id]
    job.status = "stopped"
    await manager.send(job_id, "status", {"status": "stopped"})
    return {"job_id": job_id, "status": "stopping"}


def is_stopped(job_id: str) -> bool:
    return _STOP_FLAGS.get(job_id, False)


async def run_pipeline(job_id: str, request: SearchRequest) -> None:
    job = _JOBS[job_id]
    started = time.time()
    enrich_tasks: list[asyncio.Task] = []

    log_handler = WebSocketLogHandler(lambda msg: manager.send(job_id, "log", {"message": msg, "level": "info"}))
    log_handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(log_handler)

    try:
        await manager.send(job_id, "status", {"status": "running"})
        await manager.send(job_id, "log", {"message": f"Starting search for '{request.keyword}' in '{request.location}'", "level": "info"})

        sem = asyncio.Semaphore(request.max_concurrent)

        async def enrich_business(b: Business) -> None:
            async with sem:
                if is_stopped(job_id):
                    return
                job.current_business = b.name
                await manager.send(
                    job_id,
                    "business_found",
                    {"id": b.id, "name": b.name, "status": "processing"},
                )
                await manager.send(
                    job_id,
                    "progress",
                    {
                        "current": job.current,
                        "total": job.total,
                        "percent": job.percent,
                        "current_business": job.current_business,
                        "elapsed": int(time.time() - started),
                        "remaining": job.remaining,
                    },
                )
                await scrape_website(b, timeout_secs=request.website_timeout)
                if is_stopped(job_id):
                    return
                if b.email:
                    await manager.send(
                        job_id,
                        "email_found",
                        {"email": b.email[0], "business": b.name, "total": len(b.email)},
                    )
                await manager.send(
                    job_id,
                    "business_found",
                    {
                        "id": b.id,
                        "name": b.name,
                        "email": b.email,
                        "website": b.website,
                        "facebook": b.facebook,
                        "instagram": b.instagram,
                        "tiktok": b.tiktok,
                        "contact_page": b.contact_page,
                        "status": b.status or "scraped",
                    },
                )
                await manager.send(job_id, "log", {"message": f"Scraped website: {b.name} ({len(b.email)} emails)", "level": "info"})

        async def on_business_found(business: Business) -> None:
            if is_stopped(job_id):
                return
            if business.website:
                kind, platform = classify_url(business.website)
                if kind == "social":
                    business.set_social(platform, business.website)
                    business.website = None
            job.leads.append(business)
            job.current += 1
            job.elapsed = int(time.time() - started)
            job.percent = round(job.current / max(job.total, 1) * 100, 1)
            job.remaining = (
                int((job.elapsed / job.current) * (job.total - job.current)) if job.current else None
            )
            job.current_business = business.name
            await manager.send(
                job_id,
                "business_found",
                {
                    "id": business.id,
                    "name": business.name,
                    "address": business.address,
                    "latitude": business.latitude,
                    "longitude": business.longitude,
                    "phone": business.phone,
                    "website": business.website,
                    "email": business.email,
                    "rating": business.rating,
                    "reviews": business.reviews,
                    "maps_url": business.maps_url,
                    "facebook": business.facebook,
                    "instagram": business.instagram,
                    "tiktok": business.tiktok,
                    "status": "found",
                },
            )
            if business.phone:
                await manager.send(
                    job_id, "phone_found", {"phone": business.phone, "business": business.name}
                )
            await manager.send(
                job_id,
                "progress",
                {
                    "current": job.current,
                    "total": job.total,
                    "percent": job.percent,
                    "current_business": business.name,
                    "elapsed": job.elapsed,
                    "remaining": job.remaining,
                },
            )
            await manager.send(job_id, "log", {"message": f"Found: {business.name}", "level": "info"})
            enrich_tasks.append(asyncio.create_task(enrich_business(business)))

        businesses = await scrape_google_maps(
            request.keyword, request.location, request.max_results, on_business_found,
            scroll_steps=request.scroll_steps,
            proxy_url=request.proxy_url,
            headless=request.headless,
        )
        job.total = len(businesses)

        if is_stopped(job_id):
            job.status = "stopped"
            return

        await asyncio.gather(*enrich_tasks)

        job.status = "completed" if not is_stopped(job_id) else "stopped"
        job.percent = 100.0
        job.elapsed = int(time.time() - started)
        job.remaining = 0
        await manager.send(job_id, "status", {"status": job.status})
        await manager.send(job_id, "log", {"message": f"Job finished with {len(job.leads)} businesses", "level": "info"})

    except Exception:
        logger.exception("Pipeline failed for job %s", job_id)
        job.status = "error"
        for task in enrich_tasks:
            task.cancel()
        await manager.send(job_id, "status", {"status": "error"})
    finally:
        logger.removeHandler(log_handler)
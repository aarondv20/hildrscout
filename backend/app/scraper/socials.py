from __future__ import annotations

import logging

import aiohttp
from bs4 import BeautifulSoup

from app.utils.regex import SOCIAL_DOMAINS, extract_social_links

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

EMPTY = {platform: None for platform in SOCIAL_DOMAINS}


async def _fetch_text(
    url: str,
    session: aiohttp.ClientSession,
    timeout_s: float = 10,
) -> str | None:
    try:
        timeout = aiohttp.ClientTimeout(total=timeout_s)
        async with session.get(url, timeout=timeout) as resp:
            if resp.status == 200:
                return await resp.text(errors="ignore")
    except Exception:
        logger.debug("Social fetch failed for %s (retrying)", url, exc_info=True)
    try:
        timeout = aiohttp.ClientTimeout(total=timeout_s)
        async with aiohttp.ClientSession(
            headers={"User-Agent": USER_AGENT}, timeout=timeout
        ) as fresh:
            async with fresh.get(url, timeout=timeout) as resp:
                if resp.status == 200:
                    return await resp.text(errors="ignore")
    except Exception:
        logger.debug("Social fetch retry failed for %s", url, exc_info=True)
    return None


async def find_social_links(
    base_url: str, session: aiohttp.ClientSession
) -> dict[str, str | None]:
    parts: list[str] = []
    for url in (base_url, base_url.rstrip("/") + "/contact"):
        body = await _fetch_text(url, session)
        if not body:
            continue
        try:
            soup = BeautifulSoup(body, "lxml")
            parts.append(str(soup))
        except Exception:
            parts.append(body)

    combined = "\n".join(parts)
    return extract_social_links(combined)


async def find_social_links_safe(base_url: str, session: aiohttp.ClientSession) -> dict[str, str | None]:
    try:
        return await find_social_links(base_url, session)
    except Exception:
        logger.warning("Social extraction failed for %s", base_url, exc_info=True)
        return dict(EMPTY)

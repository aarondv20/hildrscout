from __future__ import annotations

import asyncio
import logging

import aiohttp
from bs4 import BeautifulSoup

from app.utils.regex import EMAIL_PATTERN, clean_email

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

_ASSET_EXTENSIONS = (
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp",
    ".css", ".js", ".mjs", ".json", ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".webm", ".mp3", ".ogg", ".pdf", ".zip", ".gz", ".tar",
)


def _is_asset_email(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    return any(domain.endswith(ext) for ext in _ASSET_EXTENSIONS)


async def extract_emails_from_url(url: str, session: aiohttp.ClientSession) -> list[str]:
    emails: list[str] = []
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        async with session.get(url, timeout=timeout) as resp:
            if resp.status != 200:
                return []
            html = await resp.text(errors="ignore")
    except Exception:
        logger.debug("Failed to fetch %s for emails", url, exc_info=True)
        return []

    try:
        soup = BeautifulSoup(html, "lxml")
        for link in soup.find_all("a", href=True):
            href = link["href"].strip()
            if href.lower().startswith("mailto:"):
                raw = href[7:].split("?")[0]
                if cleaned := clean_email(raw):
                    emails.append(cleaned)
        for match in EMAIL_PATTERN.findall(html):
            if cleaned := clean_email(match):
                if not _is_asset_email(cleaned):
                    emails.append(cleaned)
    except Exception:
        logger.debug("HTML parse failed for %s", url, exc_info=True)

    return list(dict.fromkeys(emails))


async def find_emails_on_website(base_url: str) -> list[str]:
    paths = ["/", "/contact", "/contact-us", "/about", "/privacy", "/terms"]
    emails: list[str] = []
    try:
        timeout = aiohttp.ClientTimeout(total=20)
        async with aiohttp.ClientSession(
            headers={"User-Agent": USER_AGENT}, timeout=timeout
        ) as session:
            results = await asyncio.gather(
                *[extract_emails_from_url(base_url + path, session) for path in paths],
                return_exceptions=True,
            )
            for result in results:
                if isinstance(result, list):
                    emails.extend(result)
    except Exception:
        logger.warning("Email crawl failed for %s", base_url, exc_info=True)

    emails = list(dict.fromkeys(clean_email(e) for e in emails if clean_email(e)))
    return emails[:10]

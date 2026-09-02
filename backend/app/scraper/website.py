from __future__ import annotations

import asyncio
import logging

import aiohttp
from bs4 import BeautifulSoup

from app.models.business import Business
from app.scraper.emails import find_emails_on_website
from app.scraper.socials import find_social_links_safe
from app.utils.regex import classify_url

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


def _normalize_url(url: str) -> str | None:
    url = url.strip().rstrip("/")
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


async def scrape_website(business: Business, timeout_secs: int = 30) -> Business:
    if business.website:
        kind, platform = classify_url(business.website)
        if kind == "social":
            business.set_social(platform, business.website)
            business.website = None

    if not business.website:
        business.status = "scraped"
        return business

    url = _normalize_url(business.website)
    if url is None:
        business.status = "error"
        return business
    business.website = url

    try:
        timeout = aiohttp.ClientTimeout(total=timeout_secs)
        async with aiohttp.ClientSession(
            headers={"User-Agent": USER_AGENT}, timeout=timeout
        ) as session:
            email_task = asyncio.create_task(find_emails_on_website(url))
            social_task = asyncio.create_task(find_social_links_safe(url, session))
            contact_task = asyncio.create_task(_find_contact_page(url, session))

            emails, socials, contact_page = await asyncio.gather(
                email_task, social_task, contact_task
            )

            business.email = emails
            for platform, url in socials.items():
                if url:
                    business.set_social(platform, url)
            business.contact_page = contact_page
            business.status = "scraped"
    except Exception:
        logger.warning("Website scrape failed for %s", url, exc_info=True)
        business.status = "error"

    return business


async def _find_contact_page(url: str, session: aiohttp.ClientSession) -> str | None:
    for candidate in ("/contact", "/contact-us", "/contact.html", "/about"):
        try:
            timeout = aiohttp.ClientTimeout(total=8)
            async with session.get(url + candidate, timeout=timeout) as resp:
                if resp.status == 200:
                    return url + candidate
        except Exception:
            continue
    return None

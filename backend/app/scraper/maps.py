from __future__ import annotations

import asyncio
import logging
import os
import random
import re
from typing import Awaitable, Callable, Optional
from urllib.parse import quote

from playwright.async_api import Page, async_playwright
from tenacity import retry, stop_after_attempt, wait_exponential

from app.models.business import Business
from app.utils.regex import classify_url, clean_phone

logger = logging.getLogger(__name__)

_END_TEXT = "You've reached the end of the list"
_DATALATLNG_RE = re.compile(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)")

FEED_SELECTORS = {
    "feed": 'div[role="feed"]',
    "link": 'a[href*="/maps/place/"]',
    "card_name": "div.qBF1Pd",
    "card_rating": "span.MW4etd",
    "card_phone": "span.UsdlK",
    "card_website": 'a.lcr4fd[data-value="Website"]',
}

PANEL_SELECTORS = {
    "phone": 'button[data-item-id^="phone"]',
    "website": 'a[data-item-id="authority"]',
    "address": 'button[data-item-id="address"]',
    "rating": "span.MW4etd",
    "reviews": "span.UY7F9",
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8), reraise=False)
async def _safe_goto(page: Page, url: str) -> None:
    await page.goto(url, wait_until="domcontentloaded", timeout=60000)
    await page.wait_for_timeout(2000)


async def _scroll_results_feed(page: Page, scroll_steps: int = 12) -> bool:
    feed = page.locator(FEED_SELECTORS["feed"])
    if await feed.count() == 0:
        return False
    for _ in range(scroll_steps):
        await feed.evaluate("el => el.scrollBy(0, el.clientHeight)")
        await page.wait_for_timeout(400)
        body_text = await page.locator("body").inner_text()
        if _END_TEXT.lower() in body_text.lower():
            return True
    return False


async def _extract_card(anchor) -> dict:
    parent = anchor.locator("xpath=..")
    info: dict = {}

    name = await anchor.get_attribute("aria-label")
    if not name:
        name_el = parent.locator(FEED_SELECTORS["card_name"])
        if await name_el.count():
            name = (await name_el.first.inner_text()).strip()
    if name:
        info["name"] = name

    try:
        rating_el = parent.locator(FEED_SELECTORS["card_rating"])
        if await rating_el.count():
            raw = (await rating_el.first.inner_text()).strip().replace(",", ".")
            info["rating"] = float(raw)
    except (ValueError, Exception):
        pass

    try:
        phone_el = parent.locator(FEED_SELECTORS["card_phone"])
        if await phone_el.count():
            raw = (await phone_el.first.inner_text()).strip()
            if cleaned := clean_phone(raw):
                info["phone"] = cleaned
    except Exception:
        pass

    try:
        website_el = parent.locator(FEED_SELECTORS["card_website"])
        if await website_el.count():
            info["website"] = await website_el.first.get_attribute("href")
    except Exception:
        pass

    return info


async def _extract_detail_panel(page: Page) -> dict:
    info: dict = {}

    try:
        phone = page.locator(PANEL_SELECTORS["phone"])
        if await phone.count():
            raw = (await phone.first.inner_text()).strip().splitlines()[-1]
            if cleaned := clean_phone(raw):
                info["phone"] = cleaned
    except Exception:
        pass
    try:
        website = page.locator(PANEL_SELECTORS["website"])
        if await website.count():
            info["website"] = await website.first.get_attribute("href")
    except Exception:
        pass
    try:
        address = page.locator(PANEL_SELECTORS["address"])
        if await address.count():
            info["address"] = (await address.first.inner_text()).strip().splitlines()[-1]
    except Exception:
        pass
    try:
        rating_el = page.locator(PANEL_SELECTORS["rating"])
        if await rating_el.count():
            raw = (await rating_el.first.inner_text()).strip().replace(",", ".")
            info["rating"] = float(raw)
    except (ValueError, Exception):
        pass
    try:
        reviews_el = page.locator(
            'button[data-item-id="address"] '
            '>> xpath=ancestor::div[contains(@class,"m6QErb")][2] '
            '>> span.UY7F9'
        )
        if await reviews_el.count():
            raw = (await reviews_el.first.inner_text()).strip()
            digits = "".join(ch for ch in raw if ch.isdigit())
            if digits:
                info["reviews"] = int(digits)
    except Exception:
        pass
    return info


async def _latlng_from_href(href: str) -> Optional[tuple[float, float]]:
    match = _DATALATLNG_RE.search(href)
    if match:
        return float(match.group(1)), float(match.group(2))
    return None


async def _wait_panel_settled(
    page: Page, prev_address: Optional[str], timeout_ms: int = 8000
) -> Optional[str]:
    addr = page.locator(PANEL_SELECTORS["address"])
    deadline = asyncio.get_event_loop().time() + timeout_ms / 1000
    while asyncio.get_event_loop().time() < deadline:
        try:
            if await addr.count():
                text = (await addr.first.inner_text()).strip()
                if text and text != prev_address:
                    return text
        except Exception:
            pass
        await page.wait_for_timeout(300)
    return None


def normalize_maps_url(href: str) -> str:
    if href.startswith("http"):
        return href
    return f"https://www.google.com{href}"


async def scrape_google_maps(
    keyword: str,
    location: str,
    max_results: int,
    on_business_found: Callable[[Business], Awaitable[None]],
    *,
    scroll_steps: int = 12,
    proxy_url: Optional[str] = None,
    headless: bool = True,
) -> list[Business]:
    businesses: list[Business] = []
    query = quote(f"{keyword} {location}")
    search_url = f"https://www.google.com/maps/search/{query}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        proxy_cfg = {"server": proxy_url} if proxy_url else None
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
            locale="en-US",
            proxy=proxy_cfg,
        )
        page = await context.new_page()

        try:
            await _safe_goto(page, search_url)
            try:
                await page.wait_for_selector(FEED_SELECTORS["feed"], timeout=20000)
            except Exception:
                logger.warning("Results feed not found; continuing with page body")

            collected: dict[str, Business] = {}
            prev_address: Optional[str] = None

            for _ in range(scroll_steps * 5):  # scroll_steps × 5 = outer loop passes
                await _scroll_results_feed(page, scroll_steps=scroll_steps)
                feed = page.locator(FEED_SELECTORS["feed"])
                anchors = await feed.locator(FEED_SELECTORS["link"]).all()

                for anchor in anchors:
                    if len(collected) >= max_results:
                        break
                    href = await anchor.get_attribute("href")
                    if not href or href in collected:
                        continue

                    card = await _extract_card(anchor)
                    if not card.get("name"):
                        continue

                    try:
                        await anchor.click()
                    except Exception:
                        pass

                    settled_address = await _wait_panel_settled(page, prev_address)
                    await page.wait_for_timeout(random.randint(300, 700))
                    prev_address = settled_address or prev_address

                    panel = await _extract_detail_panel(page)
                    latlng = await _latlng_from_href(href)

                    business = Business(
                        name=card["name"],
                        address=panel.get("address") or settled_address,
                        phone=panel.get("phone") or card.get("phone"),
                        rating=panel.get("rating") or card.get("rating"),
                        reviews=panel.get("reviews"),
                        latitude=latlng[0] if latlng else None,
                        longitude=latlng[1] if latlng else None,
                        maps_url=normalize_maps_url(href),
                        status="pending",
                    )

                    raw_website = panel.get("website") or card.get("website")
                    if raw_website:
                        kind, platform = classify_url(raw_website)
                        if kind == "website":
                            business.website = raw_website
                        else:
                            business.set_social(platform, raw_website)
                    collected[href] = business
                    businesses.append(business)
                    await on_business_found(business)
                    await page.wait_for_timeout(random.randint(500, 1500))

                if len(collected) >= max_results:
                    break

                body_text = await page.locator("body").inner_text()
                if _END_TEXT.lower() in body_text.lower():
                    break

        except Exception:
            logger.exception("Google Maps scraping failed")
        finally:
            await context.close()
            await browser.close()

    return businesses[:max_results]
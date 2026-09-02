from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urlparse

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

PHONE_PATTERN = re.compile(
    r"(?:(?:\+?\d{1,3}[\s\-.]?)?(?:\(\d{2,5}\)[\s\-.]?)?\d{3}[\s\-.]?\d{3}[\s\-.]?\d{3,4})"
)

# platform -> registered domains that identify it
SOCIAL_DOMAINS: dict[str, tuple[str, ...]] = {
    "facebook": ("facebook.com", "fb.com"),
    "instagram": ("instagram.com",),
    "tiktok": ("tiktok.com",),
}

_SOCIAL_DOMAIN_SET = frozenset(
    domain for domains in SOCIAL_DOMAINS.values() for domain in domains
)


def _hostname(url: str) -> str:
    url = url.strip()
    if url.startswith("//"):
        url = "https:" + url
    parsed = urlparse(url if "://" in url else f"https://{url}")
    return (parsed.hostname or "").lower().strip(".")


def _registered_domain(hostname: str) -> str:
    """Return the last two labels (e.g. 'facebook.com', 't.me')."""
    parts = hostname.split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else hostname


def classify_url(url: str) -> tuple[str, Optional[str]]:
    """Classify a URL as ('website', None) or ('social', platform)."""
    hostname = _hostname(url)
    if not hostname:
        return "website", None
    registered = _registered_domain(hostname)
    if registered in _SOCIAL_DOMAIN_SET:
        for platform, domains in SOCIAL_DOMAINS.items():
            if registered in domains:
                return "social", platform
    return "website", None


def is_social_url(url: str) -> bool:
    return classify_url(url)[0] == "social"


def clean_email(email: str) -> Optional[str]:
    email = email.strip().lower()
    if not EMAIL_PATTERN.fullmatch(email):
        return None
    return email


def clean_phone(phone: str) -> Optional[str]:
    phone = phone.strip()
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 7:
        return None
    return phone


def extract_social_links(html: str) -> dict[str, Optional[str]]:
    found: dict[str, Optional[str]] = {}
    if not html:
        return {platform: None for platform in SOCIAL_DOMAINS}
    for match in re.finditer(r'<a\s+[^>]*href=["\']([^"\']+)["\']', html, re.IGNORECASE):
        url = match.group(1).strip()
        kind, platform = classify_url(url)
        if kind == "social" and platform and platform not in found:
            found[platform] = url
    for platform in SOCIAL_DOMAINS:
        found.setdefault(platform, None)
    return found

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class Business(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    email: list[str] = []
    rating: Optional[float] = None
    reviews: Optional[int] = None
    maps_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    contact_page: Optional[str] = None
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending | scraped | error

    def set_social(self, platform: str, url: str) -> None:
        """Store a social URL into the matching field, if the field exists."""
        if url and hasattr(self, platform):
            setattr(self, platform, url)


class SearchRequest(BaseModel):
    keyword: str
    location: str
    radius_km: int = 10
    max_results: int = 100
    output_format: str = "excel"  # excel | csv | json
    # Performance overrides (settingsStore → frontend → backend)
    max_concurrent: int = 5
    website_timeout: int = 30
    headless: bool = True
    scroll_steps: int = 12
    proxy_url: Optional[str] = None


class JobStatus(BaseModel):
    job_id: str
    status: str = "pending"  # pending | running | completed | stopped | error
    current: int = 0
    total: int = 0
    percent: float = 0.0
    current_business: Optional[str] = None
    elapsed: int = 0
    remaining: Optional[int] = None
    leads: list[Business] = []

    def model_dump_mini(self) -> dict:
        data = self.model_dump()
        data["leads"] = len(self.leads)
        return data
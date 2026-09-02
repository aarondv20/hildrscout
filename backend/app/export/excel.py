from __future__ import annotations

import json
import logging
import math
import time
from typing import Sequence
from urllib.parse import urlparse

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from app.models.business import Business

logger = logging.getLogger(__name__)

COLUMNS = [
    "Business",
    "Phone",
    "Website",
    "Email",
    "Rating",
    "Reviews",
    "Address",
    "Facebook",
    "Instagram",
    "TikTok",
    "Contact Page",
    "Maps URL",
]

HYPERLINK_BLUE = "FF0563C1"

# cap: maximum column width (openpyxl width ~ characters of default font)
# wrap: enable text wrapping
# align: data alignment
COLUMN_LAYOUT: dict[str, dict] = {
    "Business": {"cap": 45, "wrap": True, "align": "left"},
    "Phone": {"cap": 22, "wrap": False, "align": "center"},
    "Website": {"cap": 36, "wrap": True, "align": "left"},
    "Email": {"cap": 45, "wrap": True, "align": "left"},
    "Rating": {"cap": 12, "wrap": False, "align": "center"},
    "Reviews": {"cap": 12, "wrap": False, "align": "center"},
    "Address": {"cap": 50, "wrap": True, "align": "left"},
    "Facebook": {"cap": 32, "wrap": False, "align": "left"},
    "Instagram": {"cap": 32, "wrap": False, "align": "left"},
    "TikTok": {"cap": 32, "wrap": False, "align": "left"},
    "Contact Page": {"cap": 34, "wrap": True, "align": "left"},
    "Maps URL": {"cap": 40, "wrap": True, "align": "left"},
}

link_cols = {"Website", "Email", "Facebook", "Instagram", "TikTok", "Contact Page", "Maps URL"}


def _to_rows(businesses: list[Business], email_sep: str = "; ") -> list[list]:
    rows: list[list] = []
    for b in businesses:
        rows.append(
            [
                b.name or "",
                b.phone or "",
                b.website or "",
                email_sep.join(b.email or []),
                b.rating if b.rating is not None else "",
                b.reviews if b.reviews is not None else "",
                b.address or "",
                b.facebook or "",
                b.instagram or "",
                b.tiktok or "",
                b.contact_page or "",
                b.maps_url or "",
            ]
        )
    return rows


def _display_domain(url: str) -> str:
    """Return the clean registered domain for display (e.g. 'samkaraph.com')."""
    if not url:
        return ""
    parsed = urlparse(url)
    host = (parsed.hostname or url).lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def _hyperlink_font() -> Font:
    return Font(color=HYPERLINK_BLUE, underline="single")


def _estimate_lines(text: object, width: int, wrap: bool) -> int:
    """Estimate the number of display lines a cell will occupy at a given width."""
    if not wrap or not text or width <= 4:
        return 1
    total = 0
    for line in str(text).split("\n"):
        total += max(1, math.ceil(len(line) / max(width - 2, 1)))
    return max(total, 1)


def export_to_excel(businesses: list[Business], filepath: str) -> str:
    rows = _to_rows(businesses, email_sep="\n")

    wb = Workbook()
    ws = wb.active
    ws.title = "Leads"
    ws.append(COLUMNS)
    for row in rows:
        ws.append(row)

    header_font = Font(bold=True, color="FFFFFFFF", size=12, name="Inter")
    header_fill = PatternFill(start_color="FF22C55E", end_color="FF22C55E", fill_type="solid")
    row_fill_alt = PatternFill(start_color="FFF9FAFB", end_color="FFF9FAFB", fill_type="solid")

    n_cols = len(COLUMNS)
    n_rows = ws.max_row

    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for row_idx in range(2, n_rows + 1):
        for col_idx, col in enumerate(COLUMNS, start=1):
            cell = ws.cell(row=row_idx, column=col_idx)
            layout = COLUMN_LAYOUT[col]
            cell.alignment = Alignment(
                horizontal=layout["align"], vertical="center", wrap_text=layout["wrap"]
            )
            if row_idx % 2 == 0:
                cell.fill = row_fill_alt

            value = cell.value
            if not value:
                continue

            if col in link_cols:
                href = _href_for(col, value)
                if href:
                    cell.hyperlink = href
                    cell.font = _hyperlink_font()
                if col == "Website":
                    cell.value = _display_domain(value)
                elif col == "Maps URL":
                    cell.value = ws.cell(row=row_idx, column=1).value or "Open in Google Maps"
                elif col != "Email":
                    cell.value = _display_domain(value)

    widths: dict[str, int] = {}
    for i, col in enumerate(COLUMNS, start=1):
        layout = COLUMN_LAYOUT[col]
        max_len = len(col)
        for row in ws.iter_rows(min_col=i, max_col=i, min_row=2):
            for cell in row:
                if cell.value is None:
                    continue
                if layout["wrap"]:
                    longest_line = max((len(line) for line in str(cell.value).split("\n")), default=0)
                    max_len = max(max_len, longest_line)
                else:
                    max_len = max(max_len, len(str(cell.value)))
        widths[col] = min(max_len + 2, layout["cap"])

    for row_idx in range(2, n_rows + 1):
        max_lines = 1
        for col_idx, col in enumerate(COLUMNS, start=1):
            cell = ws.cell(row=row_idx, column=col_idx)
            value = cell.value
            if value is None:
                continue
            if COLUMN_LAYOUT[col]["wrap"]:
                max_lines = max(max_lines, _estimate_lines(value, widths[col], True))
        if max_lines > 1:
            ws.row_dimensions[row_idx].height = max_lines * 15 + 4

    for i, col in enumerate(COLUMNS, start=1):
        ws.column_dimensions[get_column_letter(i)].width = widths[col]

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions

    wb.save(filepath)
    logger.info("Exported %d businesses to %s", len(businesses), filepath)
    return filepath


def _href_for(col: str, value: str) -> str | None:
    if col == "Email":
        first = str(value).splitlines()[0].strip()
        if not first:
            return None
        return f"mailto:{first}"
    return _href_for_value(value)


def _href_for_value(value: str) -> str | None:
    if not value:
        return None
    if value.startswith("http"):
        return value
    return f"https://{value}"


def export_to_csv(businesses: list[Business], filepath: str) -> str:
    df = pd.DataFrame(_to_rows(businesses), columns=COLUMNS)
    df.to_csv(filepath, index=False)
    logger.info("Exported %d businesses to %s", len(businesses), filepath)
    return filepath


def export_to_json(businesses: list[Business], filepath: str) -> str:
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump([b.model_dump() for b in businesses], f, indent=2, default=str)
    logger.info("Exported %d businesses to %s", len(businesses), filepath)
    return filepath


def build_filename(job_id: str, fmt: str) -> str:
    ext = "xlsx" if fmt == "excel" else fmt
    return f"hildr_scout_{fmt}_{time.strftime('%Y%m%d_%H%M%S')}_{job_id[:8]}.{ext}"

# Hildr Scout

A professional SaaS-style lead generation tool. Enter a keyword + city, and Hildr Scout
scrapes Google Maps for matching businesses, crawls their websites for emails, phones, and
social links, streams live progress to a React dashboard over WebSocket, plots results on a
Google Map, and exports everything to Excel / CSV / JSON.

## Architecture

```
React Frontend (Vite + TypeScript + Tailwind)       FastAPI Backend (Python 3.11+)
├── Sidebar / Header                                ├── POST /api/search        — start job
├── KPI Cards (live counts)                         ├── GET  /api/status/{id}   — job progress
├── Search Form (react-hook-form + zod)             ├── GET  /api/leads/{id}    — collected leads
├── Google Map (live markers via WS)                ├── GET  /api/export/{id}   — xlsx/csv/json
├── Progress Card (SVG circular progress)           ├── DELETE /api/stop/{id}   — graceful stop
├── Leads Table (sortable, filterable, paginated)   └── WS    /ws/{job_id}      — live events
└── Zustand store + useWebSocket hook                   └── Playwright (Maps) + BeautifulSoup (websites)
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- Google Maps API key (Maps JavaScript API + Geocoding API) — optional, map falls back to a placeholder

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
playwright install chromium
copy .env.example .env            # Windows (cp .env.example .env on macOS/Linux)
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env            # add your Google Maps key here
```

## Running

### Backend

```bash
cd backend
.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/ws` to the backend, so no CORS issues in dev.

Or use the one-click scripts at the repo root: `start.bat` (Windows) / `start.sh` (macOS/Linux).

## Environment Variables

| Variable | Where | Default | Description |
|---|---|---|---|
| `VITE_GOOGLE_MAPS_KEY` | frontend/.env | — | Google Maps JS API key (required for live map) |
| `VITE_API_BASE_URL` | frontend/.env | `http://localhost:8000` | Backend base URL (empty = same origin) |
| `LOG_LEVEL` | backend/.env | `INFO` | Python logging level |
| `PLAYWRIGHT_HEADLESS` | backend/.env | `true` | Headless browser mode |
| `MAX_CONCURRENT_SCRAPERS` | backend/.env | `5` | Concurrent website scrapes per job |
| `OUTPUT_DIR` | backend/.env | `./outputs` | Where exported files are written |

## Folder Structure

```
clientscraper/
├── backend/
│   ├── app/
│   │   ├── scraper/    # maps.py (Playwright), website.py, emails.py, socials.py
│   │   ├── models/     # Pydantic: Business, SearchRequest, JobStatus
│   │   ├── export/     # Excel/CSV/JSON export (pandas + openpyxl)
│   │   ├── utils/      # regex patterns, logger, WebSocketLogHandler
│   │   ├── api/        # REST routes + WebSocket manager
│   │   └── main.py     # FastAPI app
│   ├── outputs/        # generated files
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/ # layout, dashboard, map, ui (shadcn-style)
    │   ├── hooks/      # useWebSocket (reconnect with backoff)
    │   ├── store/      # Zustand lead store (immer)
    │   ├── types/      # TS models mirroring backend
    │   └── lib/        # utils
    └── vite.config.ts  # /api + /ws proxy → :8000
```

## WebSocket Events (backend → frontend)

| Event | Data |
|---|---|
| `business_found` | Business fields (id, name, lat, lng, phone, website, email, rating, reviews) |
| `progress` | current, total, percent, current_business, elapsed, remaining |
| `status` | `{ "status": "running" | "completed" | "stopped" | "error" }` |
| `log` | `{ message, level }` |

## Notes

- Google Maps DOM selectors change frequently. If extraction breaks, run the scraper headful
  (set `PLAYWRIGHT_HEADLESS=false`) and inspect the page with Playwright's `page.pause()`.
- Keep `frontend/src/types/index.ts` in sync with `backend/app/models/business.py`.
- Never commit `.env` files (`.gitignore` covers them).

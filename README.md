# TBH Inventory Price Tracker

> Full-stack portfolio app to track Task Bar Hero in-game inventory with live Steam Market prices (IDR & USD), price alerts, and automated refresh.

![Tech Stack](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)

## Features

- 📦 **Inventory Management** — Add/remove TBH items from your personal inventory
- 💰 **Dual Currency Prices** — IDR & USD displayed side-by-side (auto-fetched from Steam Market)
- 🔄 **Auto-Refresh** — APScheduler refreshes all prices every 15 minutes
- 🔔 **Price Alerts** — Set buy/sell/% change targets and get notified when triggered
- 💬 **Notification Inbox** — In-app popup carousel + message tab
- 📊 **Price History Chart** — Dual-axis line chart (IDR left, USD right)
- 📤 **Export CSV** — Download full inventory + price data
- 🌙 **Dark / Light Mode** — Default dark, toggle in top bar
- 📱 **Fully Responsive** — Table view on desktop, card view on mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy 2.x, SQLite, APScheduler, httpx |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Auth | JWT in httpOnly cookies, bcrypt passwords |
| Deploy | Docker + Docker Compose |

## Quick Start

### 1. Clone & setup

```bash
git clone <repo-url>
cd TBH-Price
cp .env.example .env
# Edit .env and set SECRET_KEY to a strong random string
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:8000/docs

### 3. Run locally (development)

**Backend:**
```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## First-Time Setup

1. Register an account at http://localhost:3000/register
2. Go to **Browse Items** → click **Sync from Steam**
   - This fetches all TBH items from Steam Market (takes ~1-2 min due to rate limiting)
3. Browse and add items to your inventory
4. Prices refresh automatically every 15 minutes, or click **Refresh All** manually

## Project Structure

```
TBH-Price/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # 7 route files
│   │   ├── core/           # steam.py, scheduler.py, security.py, alert_checker.py
│   │   ├── db/             # models (7 tables), database, crud
│   │   └── schemas/        # Pydantic v2 schemas
│   ├── data/               # tbh_items_master.json (auto-generated)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/            # Next.js App Router pages
│       ├── components/     # UI components
│       ├── lib/            # api.ts, currency.ts, utils.ts
│       └── types/          # TypeScript interfaces
├── docker-compose.yml
└── .env.example
```

## API Overview

Base URL: `http://localhost:8000/api/v1`

| Method | Path | Description |
|---|---|---|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login (sets httpOnly cookie) |
| GET | /items | Browse master items (paginated) |
| GET | /items/search?q= | Autocomplete search |
| POST | /items/seed | Fetch items from Steam Market |
| GET | /inventory | List inventory with prices |
| POST | /inventory | Add item to inventory |
| POST | /inventory/bulk | Bulk add items |
| POST | /prices/refresh | Refresh all prices |
| GET | /prices/{id}/history | Price history for chart |
| POST | /alerts | Create price alert |
| GET | /notifications/unread | Get unread notifications |
| GET | /export/csv | Download inventory as CSV |

Full documentation: http://localhost:8000/docs

## Steam Market Integration

- App ID: `3678970` (Task Bar Hero)
- Currencies: IDR (`currency=9`) + USD (`currency=1`)
- Rate limiting: `asyncio.sleep(3)` between every request
- HTTP 429 backoff: 30s → 60s → 120s → skip
- Item seeding via: `POST /api/v1/items/seed`

## License

MIT — built for portfolio and personal use.

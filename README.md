# TBH Inventory Price Tracker

App Link : http://localhost:3000

This project focuses on designing and implementing a **Task Bar Hero (TBH) Inventory Price Tracker** to support **monitoring, valuation, and alerting** for *Task Bar Hero* in-game items traded on the Steam Community Market.

The system tracks dynamic price fluctuations in IDR and USD, calculates cumulative portfolio values, and triggers custom price alerts.

---

## 🎯 Project Objectives
- Centralize in-game item inventory management for players
- Enable analytical tracking of items and cumulative values
- Provide real-time price updates (IDR & USD) and automated price synchronization
- Support price threshold notifications (alerts) to aid trading decisions

---

## 🏗️ Database Architecture & ERD
This project follows a relational database schema designed to support user accounts, inventory portfolios, historical pricing logs, and system settings.

### 📊 Database Schema
The database is structured with the following key tables:

**User & Portfolio Tables**
- `users` — Represents registered user accounts
- `inventory_items` — Represents items added to user portfolios (quantity, custom notes)

**Item & Pricing Tables**
- `master_items` — Canonical registry of TBH items
- `market_summary` — Latest pricing, volume, and last check times from Steam
- `price_history` — Historical price logs for charting

**Alerts & Logging Tables**
- `price_alerts` — Configured price thresholds (buy/sell targets)
- `notifications` — Mailbox warnings and system messages
- `sync_logs` — Logs history of background price synchronizations

![Database ERD](Design/erd.png)

---

## 🔄 ETL & Data Flow
The system implements a continuous data flow process:

1. **Extract & Seed**  
   Fetches the global catalogue of TBH items from the Steam Community Market and initializes the `master_items` registry.

2. **Dynamic Sync**  
   - A background scheduler runs every 30 minutes to fetch live prices for all tracked items.
   - Cleanses price formats and stores them in both IDR (Rupiah) and USD.
   - Saves records into `price_history` for line charting.

3. **Alert Evaluation**  
   - Immediately after price updates, the system scans configured `price_alerts`.
   - If a threshold is crossed, a new record is created in `notifications` to alert the user.

---

## 🚀 Documentation

### 💻 User Interface (UI)

#### 📊 Dashboard Page
Shows cumulative inventory values, change rates, latest price updates, recent notifications, and the price alert history chart.
![Dashboard Page](Design/Result%20Design/Dashboard.png)

#### 📦 Inventory Page
Manage items, quantities, custom notes, edit details, set alerts, or delete items via a custom Portal-rendered verification modal.
![Inventory Page](Design/Result%20Design/Inventory.png)

#### 🔍 Browse Items Page
Allows searching and browsing the master list of TBH items, with active sync tools to fetch items from the Steam Market.
![Browse Items Page](Design/Result%20Design/Browse.png)

#### 📖 How To Use Page
Guide on how to configure, set up, and make the most out of the tracker.
![How To Use Page](Design/Result%20Design/HTU.png)

#### ℹ️ About Page
Displays details about the application version (dynamic theme-aware badge), game details, and unofficial disclaimer.
![About Page](Design/Result%20Design/About.png)

---

## 🛠️ Tools & Technologies

- **Database**: SQLite (SQLAlchemy 2.x ORM)
- **Backend Framework**: FastAPI (Python)
- **Frontend Framework**: Next.js 14 App Router, TypeScript, React Portals
- **Task Scheduling**: APScheduler (Python background jobs)
- **Containerization**: Docker & Docker Compose

Thanks for visiting and checking out my code!

---

## 🔒 Authentication & OTP Infrastructure

The project includes a robust, production-grade security and authentication system incorporating:
1. **HttpOnly Cookie JWT Session**: Tokens are stored strictly in browser cookies to mitigate XSS risk.
2. **Register Verification**: User accounts are created in an unverified state; activation requires entering a 6-digit OTP code sent via email.
3. **Forgot Password**: Secured by email OTP code. The endpoint uses constant-time validation and protects against email enumeration.
4. **Delete Account**: Highly secure flow requiring both password validation and a second-factor OTP confirmation before permanent cascade deletion.

### ⚙️ OTP Configuration (.env)

The following parameters in `.env` govern the OTP system:
- `SMTP_HOST`: Host of your SMTP provider (e.g. `smtp.gmail.com`). Leave empty to log OTP codes to stdout.
- `SMTP_PORT`: Port (typically `587` or `465`).
- `SMTP_USERNAME` / `SMTP_PASSWORD`: SMTP credentials.
- `SMTP_FROM`: Sender address.
- `OTP_EXPIRE_MINUTES`: Expiry window for OTP codes (default: `5`).
- `OTP_RESEND_SECONDS`: Cooldown interval in seconds before a code can be resent (default: `60`).
- `OTP_MAX_ATTEMPTS`: Max incorrect OTP entry attempts before code is invalidated (default: `5`).
- `OTP_MAX_RESEND`: Max resend requests permitted per session (default: `3`).

---
***Copyright © 2026 by Steven | All Rights Reserved**

Built for portfolio and personal use.

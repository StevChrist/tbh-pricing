"""
TBH Price Tracker — Admin Notification & Alert Test Tool
=========================================================
Script ini mengirim notifikasi, messages, dan alert ke user admin.
Semua data diinject sekaligus, lalu user bisa verifikasi di browser.

Jalankan dari folder backend:
    .\.venv\Scripts\python test_admin_notifications.py

Pastikan backend berjalan: python main.py
"""

import asyncio
import sys
import json
from datetime import datetime, timezone, timedelta

# ── Backend path ────────────────────────────────────────────────────────────
sys.path.append(".")
from app.db.database import AsyncSessionLocal
from app.db.models import (
    User, MasterItem, Notification, PriceAlert,
    AlertTypeEnum, AlertCurrencyEnum, AlertDirectionEnum,
)
from sqlalchemy import select
import httpx

BASE_URL = "http://localhost:8000/api/v1"

# ── Colours ─────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def ok(msg: str, detail=None):
    print(f"{GREEN}[OK]   {msg}{RESET}")
    if detail is not None:
        if isinstance(detail, (dict, list)):
            txt = json.dumps(detail, indent=2, default=str)
            print("       " + txt.replace("\n", "\n       ")[:800])
        else:
            print(f"       {detail}")


def fail(msg: str, detail=None):
    print(f"{RED}[FAIL] {msg}{RESET}")
    if detail is not None:
        print(f"       {detail}")


def info(msg: str):
    print(f"{CYAN}[INFO] {msg}{RESET}")


def warn(msg: str):
    print(f"{YELLOW}[WARN] {msg}{RESET}")


def section(title: str):
    print(f"\n{BOLD}{YELLOW}{'='*60}{RESET}")
    print(f"{BOLD}{YELLOW}  {title}{RESET}")
    print(f"{BOLD}{YELLOW}{'='*60}{RESET}")


# ── DB helpers ───────────────────────────────────────────────────────────────

async def get_admin_user() -> User | None:
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(User).where((User.role == "admin") | (User.username == "admin"))
        )
        return res.scalars().first()


async def get_test_items(limit: int = 3) -> list[MasterItem]:
    """Get a few distinct items to create diverse alerts/notifications."""
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(MasterItem)
            .where(MasterItem.market_hash_name.is_not(None))
            .limit(limit)
        )
        return list(res.scalars().all())


async def inject_notification_db(
    user_id: int,
    alert_id: int,
    master_item_id: int,
    message: str,
    triggered_price_usd: float,
    is_read: bool = False,
) -> int:
    """Insert a notification directly into DB (simulates scheduler trigger)."""
    async with AsyncSessionLocal() as db:
        n = Notification(
            user_id=user_id,
            alert_id=alert_id,
            master_item_id=master_item_id,
            message=message,
            triggered_price_idr=triggered_price_usd * 16000,
            triggered_price_usd=triggered_price_usd,
            target_value=10.00,
            is_read=is_read,
            created_at=datetime.now(timezone.utc),
        )
        db.add(n)
        await db.commit()
        await db.refresh(n)
        return n.id


# ── Test API helpers ─────────────────────────────────────────────────────────

async def test_list_all(client, h) -> dict:
    r = await client.get("/notifications", headers=h)
    return r.json()


async def test_list_unread(client, h) -> dict:
    r = await client.get("/notifications/unread", headers=h)
    return r.json()


async def test_mark_one_read(client, h, notif_id: int) -> bool:
    r = await client.put(f"/notifications/{notif_id}/read", headers=h)
    return r.status_code == 200 and r.json().get("is_read") is True


async def test_mark_all_read(client, h) -> bool:
    r = await client.put("/notifications/read-all", headers=h)
    return r.status_code in (200, 204)


async def test_delete_notif(client, h, notif_id: int) -> bool:
    r = await client.delete(f"/notifications/{notif_id}", headers=h)
    return r.status_code == 204


async def test_delete_alert(client, h, alert_id: int) -> bool:
    r = await client.delete(f"/alerts/{alert_id}", headers=h)
    return r.status_code == 204


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    print(f"\n{BOLD}TBH Price Tracker — Admin Notification & Alert Test{RESET}")
    print("=" * 60)

    # ── 0. Verify admin ──────────────────────────────────────────
    section("0. Verify Admin User")
    admin = await get_admin_user()
    if not admin:
        fail("Admin user tidak ditemukan. Buat dulu dengan username='admin' atau role='admin'.")
        return
    info(f"Admin: id={admin.id}, username={admin.username}, role={admin.role}")

    items = await get_test_items(limit=3)
    if not items:
        fail("Tidak ada item di database.")
        return
    for i, it in enumerate(items):
        info(f"Item {i+1}: id={it.id}, name={it.display_name}, rarity={it.rarity}")

    # ── 1. Login ─────────────────────────────────────────────────
    section("1. Login as Admin")
    admin_password = input(f"  Password untuk '{admin.username}': ").strip()

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        r = await client.post("/auth/login", json={
            "username": admin.username,
            "password": admin_password,
        })
        if r.status_code != 200:
            fail(f"Login gagal: HTTP {r.status_code}", r.text)
            return
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        ok(f"Login berhasil sebagai {admin.username}")

        # ── 2. Create 3 Alerts ───────────────────────────────────
        section("2. Membuat 3 Price Alert (via API)")
        alert_ids = []
        alert_configs = [
            ("price_below", "USD", 99999.99),
            ("price_above", "USD", 0.01),
            ("price_below", "IDR", 999999999.0),
        ]
        for i, (atype, currency, target) in enumerate(alert_configs):
            item = items[i % len(items)]
            r = await client.post("/alerts", headers=h, json={
                "master_item_id": item.id,
                "alert_type": atype,
                "currency": currency,
                "target_value": target,
            })
            if r.status_code != 201:
                fail(f"Buat alert gagal: HTTP {r.status_code}", r.text)
                continue
            a = r.json()
            alert_ids.append(a["id"])
            ok(f"Alert #{a['id']}: {item.display_name} | {atype} | {currency} {target:,.2f}")

        if not alert_ids:
            fail("Tidak ada alert yang berhasil dibuat.")
            return

        # ── 3. Inject Notifications ──────────────────────────────
        section("3. Inject Notifikasi ke Mailbox (Simulasi Scheduler)")
        notif_specs = [
            # (alert_idx, item_idx, message, price_usd, is_read)
            (0, 0, "Harga turun drastis! Alert price_below terpicu.", 4.50, False),
            (0, 0, "Harga turun lebih jauh. Perhatikan posisi inventory Anda.", 2.10, False),
            (1, 1, "Harga naik melampaui target! Alert price_above terpicu.", 150.00, False),
            (2, 2, "Alert IDR: Harga mendekati batas bawah yang ditetapkan.", 6.75, False),
            (0, 0, "[Lama] Alert lama yang sudah dibaca sebelumnya.", 10.00, True),
        ]

        notif_ids = []
        for (aidx, iidx, msg_text, price, is_read) in notif_specs:
            alert_id = alert_ids[aidx % len(alert_ids)]
            item = items[iidx % len(items)]
            full_msg = f"{msg_text} | Harga: ${price:.2f} (IDR {price*16000:,.0f})"
            nid = await inject_notification_db(
                user_id=admin.id,
                alert_id=alert_id,
                master_item_id=item.id,
                message=full_msg,
                triggered_price_usd=price,
                is_read=is_read,
            )
            notif_ids.append((nid, is_read))
            tag = "[read]  " if is_read else "[UNREAD]"
            ok(f"Notif #{nid} {tag}: {msg_text[:55]}...")

        total_injected  = len(notif_ids)
        total_unread    = sum(1 for _, r in notif_ids if not r)
        total_read      = sum(1 for _, r in notif_ids if r)
        print(f"\n  {BOLD}Total: {total_injected} notifikasi — {total_unread} UNREAD, {total_read} sudah read{RESET}")

        # ── 4. API Verification ──────────────────────────────────
        section("4. Verifikasi via API")

        # 4a. List all
        data_all = await test_list_all(client, h)
        got_total  = len(data_all["notifications"])
        got_unread = data_all["unread_count"]
        is_ok = got_total >= total_injected and got_unread == total_unread
        (ok if is_ok else fail)(
            f"List all → {got_total} total, {got_unread} unread "
            f"(expected >= {total_injected} total, {total_unread} unread)"
        )
        for n in data_all["notifications"]:
            tag = "[UNREAD]" if not n["is_read"] else "[read]  "
            print(f"       {tag} #{n['id']}: {n['message'][:55]}...")

        # 4b. List unread only
        data_unread = await test_list_unread(client, h)
        (ok if data_unread["unread_count"] == total_unread else fail)(
            f"List unread → {data_unread['unread_count']} (expected {total_unread})"
        )

        # ── 5. Browser Verification (pause) ──────────────────────
        section("5. Verifikasi di Browser")
        print(f"""
  {BOLD}Buka browser dan cek hal berikut:{RESET}

  {CYAN}A. Halaman MAILBOX (http://localhost:3000/mailbox){RESET}
     - Tab "All Messages"    → harus ada {got_total} pesan
     - Tab "Unread Messages" → harus ada {data_unread['unread_count']} pesan dengan badge [NEW]
     - Badge angka di topbar/bell icon → harus menunjukkan {data_unread['unread_count']}
     - Klik salah satu pesan [UNREAD] → harus berubah jadi 'read'
     - Tombol "Mark all as read" → coba klik, semua pesan harus jadi read

  {CYAN}B. Alert Badge di TopBar{RESET}
     - Bell icon harus menampilkan angka {data_unread['unread_count']}

  {CYAN}C. Notif Popup Carousel (jika muncul){RESET}
     - Carousel popup harus muncul otomatis dengan pesan unread
""")
        input(f"  {YELLOW}Setelah selesai verifikasi di browser, tekan ENTER untuk lanjut ke test API...{RESET}")

        # ── 6. Mark one as read ──────────────────────────────────
        section("6. Test: Mark One Notification as Read (API)")
        # Re-fetch current unread (user may have clicked some in browser)
        fresh_unread = await test_list_unread(client, h)
        first_unread_notif = next(iter(fresh_unread["notifications"]), None)

        if first_unread_notif:
            nid = first_unread_notif["id"]
            success = await test_mark_one_read(client, h, nid)
            (ok if success else fail)(f"Mark notif #{nid} as read → {'berhasil' if success else 'GAGAL'}")
            after = await test_list_unread(client, h)
            ok(f"Unread count setelah mark-one: {after['unread_count']} (berkurang 1)")
        else:
            warn("Tidak ada notif unread tersisa (sudah dibaca semua di browser) — skip")

        # ── 7. Mark all as read ──────────────────────────────────
        section("7. Test: Mark ALL as Read (API)")
        success = await test_mark_all_read(client, h)
        (ok if success else fail)(f"Mark all read → {'berhasil' if success else 'GAGAL'}")
        after = await test_list_unread(client, h)
        (ok if after["unread_count"] == 0 else fail)(
            f"Unread count setelah mark-all: {after['unread_count']} (expected 0)"
        )

        # ── 8. Delete one notification ───────────────────────────
        section("8. Test: Delete One Notification (API)")
        # Delete the last injected one
        nid_del = notif_ids[-1][0]
        success = await test_delete_notif(client, h, nid_del)
        (ok if success else fail)(f"Delete notif #{nid_del} → {'berhasil' if success else 'GAGAL'}")
        after_all = await test_list_all(client, h)
        ok(f"Notifikasi tersisa setelah delete: {len(after_all['notifications'])}")

        # ── 9. Alerts status ─────────────────────────────────────
        section("9. Verifikasi Alerts via API")
        r = await client.get("/alerts", headers=h)
        active_alerts = r.json()
        ok(f"Active alerts: {len(active_alerts)}")
        for a in active_alerts:
            print(f"       Alert #{a['id']}: {a['item_display_name']} | {a['alert_type']} {a['currency']} {a['target_value']}")

        # ── 10. Cleanup ──────────────────────────────────────────
        section("10. Cleanup")
        cleanup = input("\n  Hapus semua test data? (y/N): ").strip().lower()
        if cleanup == "y":
            print()
            # PENTING: hapus notifications DULU sebelum alerts
            # karena Notification.alert_id FK ke PriceAlert dengan CASCADE
            remaining_nids = [nid for nid, _ in notif_ids if nid != nid_del]
            for nid in remaining_nids:
                success = await test_delete_notif(client, h, nid)
                print(f"       Notif #{nid} → {'OK' if success else 'SKIP (sudah dihapus)'}")

            # Baru hapus alerts
            for aid in alert_ids:
                success = await test_delete_alert(client, h, aid)
                print(f"       Alert #{aid} → {'OK' if success else 'GAGAL'}")

            ok("Semua test data berhasil dihapus!")
        else:
            warn("Cleanup dilewati. Test data tetap di database.")
            info(f"Alert IDs    : {alert_ids}")
            info(f"Notif IDs    : {[nid for nid, _ in notif_ids]}")

    # ── Summary ──────────────────────────────────────────────────
    section("SELESAI")
    print(f"{GREEN}{BOLD}Semua test admin notification & alert selesai!{RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())

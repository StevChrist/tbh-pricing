"""
Steam Community Market client for TBH Inventory Price Tracker.

Rules enforced:
- asyncio.sleep(3) before EVERY request — no exceptions.
- HTTP 429 → exponential backoff: 30s → 60s → 120s → skip (log WARNING).
- success:false → fetch_status='unavailable', prices=None.
- All exceptions caught and logged; never bubble up raw exceptions.
- Browser-like User-Agent and Referer headers on every request.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
import re
import urllib.parse
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STEAM_APP_ID = 3678970
STEAM_MARKET_BASE = "https://steamcommunity.com/market"
PRICE_OVERVIEW_URL = f"{STEAM_MARKET_BASE}/priceoverview/"
SEARCH_RENDER_URL = f"{STEAM_MARKET_BASE}/search/render/"

BACKOFF_DELAYS = [30, 60, 120]  # seconds for HTTP 429 retries
REQUEST_DELAY = 3               # seconds between every request (hard rule)
CURRENCY_IDR = 10               # Steam currency code for Indonesian Rupiah (NOT 9 which is NOK)
CURRENCY_USD = 1                # Steam currency code for US Dollar

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Referer": f"{STEAM_MARKET_BASE}/search?appid={STEAM_APP_ID}",
    "Accept-Language": "en-US,en;q=0.9",
}

# Regex to strip non-numeric chars from price strings (keep dot as decimal)
_PRICE_STRIP_RE = re.compile(r"[^\d.,]")


# ---------------------------------------------------------------------------
# Price parser
# ---------------------------------------------------------------------------


def _parse_price(raw: str | None, is_idr: bool = False) -> float | None:
    """
    Convert Steam price string to float.

    Handles formats:
      - IDR: "Rp 1.500.000" → 1500000.0
      - USD: "$12.50"       → 12.5

    Returns None on any parse failure.
    """
    if not raw:
        return None
    try:
        # Remove currency symbols and spaces
        cleaned = _PRICE_STRIP_RE.sub("", raw).strip()
        if not cleaned:
            return None

        if is_idr:
            # IDR price logic:
            #   - "Rp 1.500.000" → dot is thousands separator → 1500000.0
            #   - "Rp 899.87"    → dot is decimal point → 899.87
            #   - "Rp 1.500,00"  → dot=thousands, comma=decimal → 1500.0
            # Strategy: if there's exactly one dot and digits after it are
            # NOT groups of 3, treat it as a decimal separator.
            if cleaned.endswith(",00") or cleaned.endswith(".00"):
                cleaned = cleaned[:-3]
                cleaned = cleaned.replace(".", "").replace(",", "")
                return float(cleaned)

            dot_count = cleaned.count(".")
            comma_count = cleaned.count(",")

            if comma_count > 0:
                # Has comma: dot is thousands, comma is decimal
                # e.g. "1.500,50" → 1500.50
                cleaned = cleaned.replace(".", "").replace(",", ".")
                return float(cleaned)

            if dot_count == 1:
                # Single dot: check if it's a decimal or thousands separator
                parts = cleaned.split(".")
                after_dot = parts[1]
                if len(after_dot) == 3 and len(parts[0]) >= 1:
                    # e.g. "1.500" → thousands separator → 1500
                    cleaned = cleaned.replace(".", "")
                    return float(cleaned)
                else:
                    # e.g. "899.87" → decimal point → 899.87
                    return float(cleaned)

            if dot_count > 1:
                # Multiple dots: all are thousands separators
                # e.g. "1.500.000" → 1500000
                cleaned = cleaned.replace(".", "")
                return float(cleaned)

            # No dots or commas
            return float(cleaned)
        else:
            # Generic / USD logic
            last_comma = cleaned.rfind(",")
            last_dot = cleaned.rfind(".")

            if last_comma > last_dot:
                # European: dots as thousands, comma as decimal
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                # US: commas as thousands, dot as decimal
                cleaned = cleaned.replace(",", "")

            return float(cleaned)
    except (ValueError, AttributeError):
        logger.debug("Failed to parse price string: %r", raw)
        return None


# ---------------------------------------------------------------------------
# Exchange rate cache & fallback helper
# ---------------------------------------------------------------------------

_exchange_rate_cache: float | None = None
_exchange_rate_last_fetched: datetime | None = None

async def _get_usd_to_idr_rate() -> float:
    global _exchange_rate_cache, _exchange_rate_last_fetched
    now = datetime.now(timezone.utc)
    if _exchange_rate_cache and _exchange_rate_last_fetched and (now - _exchange_rate_last_fetched).total_seconds() < 3600:
        return _exchange_rate_cache

    try:
        # Use open.er-api.com with 3-second timeout so it never blocks/freezes the scheduler
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get("https://open.er-api.com/v6/latest/USD")
            if res.status_code == 200:
                rate = res.json()["rates"]["IDR"]
                _exchange_rate_cache = float(rate)
                _exchange_rate_last_fetched = now
                logger.info("Fetched live USD to IDR rate: %.2f", rate)
                return _exchange_rate_cache
    except Exception as exc:
        logger.warning("Failed to fetch live exchange rate: %s. Using fallback.", exc)

    return 16300.0


# ---------------------------------------------------------------------------
# SteamMarketClient
# ---------------------------------------------------------------------------


class SteamMarketClient:
    """
    Async HTTP client for the Steam Community Market.

    Usage:
        async with SteamMarketClient() as client:
            price = await client.get_item_price("Some Item Name")
    """

    def __init__(self, request_delay: int = REQUEST_DELAY) -> None:
        self._delay = request_delay
        self._client: httpx.AsyncClient | None = None

    # ------------------------------------------------------------------
    # Context manager
    # ------------------------------------------------------------------

    async def __aenter__(self) -> "SteamMarketClient":
        self._client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers=HEADERS,
        )
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.close()

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError(
                "SteamMarketClient must be used as an async context manager."
            )
        return self._client

    async def _get_with_backoff(self, url: str, params: dict) -> httpx.Response | None:
        """
        Perform a GET request with:
        - Mandatory asyncio.sleep(REQUEST_DELAY) before sending.
        - Exponential backoff on HTTP 429.
        Returns the Response or None if all retries exhausted.
        """
        client = self._get_client()
        await asyncio.sleep(self._delay)

        for attempt, backoff in enumerate(BACKOFF_DELAYS + [None], start=1):
            try:
                response = await client.get(url, params=params)
                if response.status_code == 429:
                    if backoff is None:
                        logger.warning(
                            "Steam returned 429 after %d attempts for %s — skipping.",
                            attempt - 1,
                            params,
                        )
                        return None
                    logger.warning(
                        "Steam 429 (attempt %d/%d). Backing off for %ds. URL: %s",
                        attempt,
                        len(BACKOFF_DELAYS),
                        backoff,
                        url,
                    )
                    await asyncio.sleep(backoff)
                    continue
                return response
            except httpx.TimeoutException:
                logger.error("Timeout fetching %s params=%s", url, params)
                return None
            except httpx.RequestError as exc:
                logger.error("Request error fetching %s: %s", url, exc)
                return None
        return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_item_price(
        self,
        market_hash_name: str,
        currency_idr: int = CURRENCY_IDR,
        currency_usd: int = CURRENCY_USD,
    ) -> dict | None:
        """
        Fetch the latest price for a single item in both IDR and USD.

        Returns a dict with keys:
          lowest_price_idr, median_price_idr,
          lowest_price_usd, median_price_usd,
          volume, fetch_status

        Returns None only on a hard connection failure.
        On success:false, returns dict with nulls and fetch_status='unavailable'.
        """
        encoded = urllib.parse.quote(market_hash_name)

        # --- Fetch IDR ---
        idr_result = await self._fetch_single_currency(
            market_hash_name, currency_idr, label="IDR"
        )

        # --- Fetch USD (another sleep happens inside _fetch_single_currency) ---
        usd_result = await self._fetch_single_currency(
            market_hash_name, currency_usd, label="USD"
        )

        if idr_result is None and usd_result is None:
            return None

        # Merge results — use IDR fetch_status as canonical
        fetch_status = (idr_result or {}).get("fetch_status", "error")
        if usd_result and usd_result.get("fetch_status") == "ok":
            fetch_status = "ok"

        volume = None
        if idr_result and idr_result.get("volume") is not None:
            volume = idr_result["volume"]
        elif usd_result and usd_result.get("volume") is not None:
            volume = usd_result["volume"]

        lowest_price_idr = (idr_result or {}).get("lowest_price")
        median_price_idr = (idr_result or {}).get("median_price")
        lowest_price_usd = (usd_result or {}).get("lowest_price")
        median_price_usd = (usd_result or {}).get("median_price")

        # Fallback logic if Steam returned another currency for IDR (e.g. Krona/kr due to server location)
        idr_ok = idr_result and idr_result.get("fetch_status") == "ok"
        idr_actual = idr_result and idr_result.get("is_actual_idr", True)
        usd_ok = usd_result and usd_result.get("fetch_status") == "ok"

        if (not idr_ok or not idr_actual) and usd_ok:
            rate = await _get_usd_to_idr_rate()
            if lowest_price_usd is not None:
                lowest_price_idr = round(lowest_price_usd * rate, 2)
            if median_price_usd is not None:
                median_price_idr = round(median_price_usd * rate, 2)
            logger.info(
                "Steam did not return IDR for %s (idr_ok=%s, idr_actual=%s). "
                "Converted USD lowest (%.2f) and median (%.2f) to IDR using rate %.2f.",
                market_hash_name,
                idr_ok,
                idr_actual,
                lowest_price_usd or 0.0,
                median_price_usd or 0.0,
                rate,
            )

        return {
            "lowest_price_idr": lowest_price_idr,
            "median_price_idr": median_price_idr,
            "lowest_price_usd": lowest_price_usd,
            "median_price_usd": median_price_usd,
            "volume": volume,
            "fetch_status": fetch_status,
        }

    async def _fetch_single_currency(
        self, market_hash_name: str, currency: int, label: str = ""
    ) -> dict | None:
        """
        Internal: fetch price for one currency code.
        Returns dict with lowest_price, median_price, volume, fetch_status.
        """
        params = {
            "appid": STEAM_APP_ID,
            "market_hash_name": market_hash_name,
            "currency": currency,
        }
        response = await self._get_with_backoff(PRICE_OVERVIEW_URL, params)
        if response is None:
            return {"lowest_price": None, "median_price": None, "volume": None, "fetch_status": "error"}

        try:
            data = response.json()
        except Exception as exc:
            logger.error(
                "Failed to parse JSON for %s (%s): %s",
                market_hash_name,
                label,
                exc,
            )
            return {"lowest_price": None, "median_price": None, "volume": None, "fetch_status": "error"}

        if not data.get("success"):
            logger.info(
                "Steam success=false for %s (%s) — item unavailable on market.",
                market_hash_name,
                label,
            )
            return {"lowest_price": None, "median_price": None, "volume": None, "fetch_status": "unavailable"}

        is_idr = label == "IDR"
        lowest = _parse_price(data.get("lowest_price"), is_idr=is_idr)
        median = _parse_price(data.get("median_price"), is_idr=is_idr)

        raw_lowest = data.get("lowest_price")
        is_actual_idr = True
        if is_idr and raw_lowest:
            if "rp" not in raw_lowest.lower():
                is_actual_idr = False

        raw_volume = data.get("volume", "")
        volume: int | None = None
        if raw_volume:
            try:
                volume = int(str(raw_volume).replace(",", ""))
            except ValueError:
                pass

        return {
            "lowest_price": lowest,
            "median_price": median,
            "volume": volume,
            "fetch_status": "ok",
            "is_actual_idr": is_actual_idr,
        }

    async def get_all_market_items(self) -> list[dict]:
        """
        Paginate through the Steam Market search to retrieve all TBH items.

        Applies REQUEST_DELAY between page requests.
        Returns a list of parsed item dicts with price and metadata details.
        """
        all_items: list[dict] = []
        start = 0
        page_size = 100
        rate = await _get_usd_to_idr_rate()

        logger.info("Starting Steam Market item fetch for appid=%d (Using conversion rate: %.2f)", STEAM_APP_ID, rate)

        while True:
            params = {
                "appid": STEAM_APP_ID,
                "norender": 1,
                "start": start,
                "count": page_size,
                "currency": 1,  # Force USD responses for reliable parsing
            }
            response = await self._get_with_backoff(SEARCH_RENDER_URL, params)
            if response is None:
                logger.warning("Steam search fetch failed at start=%d — stopping.", start)
                break

            try:
                data = response.json()
            except Exception as exc:
                logger.error("Failed to parse Steam search JSON at start=%d: %s", start, exc)
                break

            results = data.get("results", [])
            total_count = data.get("total_count", 0)

            if not results:
                logger.info("No more items at start=%d (total=%d).", start, total_count)
                break

            for raw in results:
                parsed = await self.parse_market_search_result(raw, rate)
                all_items.append(parsed)

            logger.info(
                "Fetched %d items (start=%d, total_count=%d, collected=%d).",
                len(results),
                start,
                total_count,
                len(all_items),
            )

            start += len(results)
            if start >= total_count:
                break

        logger.info("Steam Market fetch complete. Total items: %d", len(all_items))
        return all_items

    @classmethod
    async def parse_market_search_result(cls, raw: dict, rate: float) -> dict:
        """Parse raw Steam search result item, resolving price details in USD and IDR."""
        asset = raw.get("asset_description", {})
        hash_name = raw.get("hash_name", raw.get("name", ""))
        display_name = raw.get("name", hash_name)

        price_text = raw.get("sell_price_text")
        is_idr_response = False
        if price_text and "rp" in price_text.lower():
            is_idr_response = True

        lowest_usd = None
        lowest_idr = None

        if is_idr_response:
            # Steam returned IDR
            if raw.get("sell_price"):
                try:
                    lowest_idr = float(raw["sell_price"]) / 100.0
                except (ValueError, TypeError):
                    pass
            if lowest_idr is None and price_text:
                lowest_idr = _parse_price(price_text, is_idr=True)
            
            if lowest_idr is not None:
                lowest_usd = round(lowest_idr / rate, 2)
        else:
            # Steam returned USD (or other default)
            if raw.get("sell_price"):
                try:
                    lowest_usd = float(raw["sell_price"]) / 100.0
                except (ValueError, TypeError):
                    pass
            if lowest_usd is None and price_text:
                lowest_usd = _parse_price(price_text, is_idr=False)
            
            if lowest_usd is not None:
                lowest_idr = round(lowest_usd * rate, 2)

        volume = None
        if raw.get("sell_listings") is not None:
            try:
                volume = int(raw["sell_listings"])
            except (ValueError, TypeError):
                pass

        # Construct market listings URL
        encoded_hash = urllib.parse.quote(hash_name)
        market_url = f"{STEAM_MARKET_BASE}/listings/{STEAM_APP_ID}/{encoded_hash}"

        # Parse type and icon URL
        item_type = asset.get("type")
        icon_url = asset.get("icon_url")
        if icon_url:
            icon_url = f"https://community.cloudflare.steamstatic.com/economy/image/{icon_url}/96fx96f"

        return {
            "market_hash_name": hash_name,
            "display_name": display_name,
            "latest_price_usd": lowest_usd,
            "latest_price_idr": lowest_idr,
            "volume": volume,
            "market_url": market_url,
            "icon_url": icon_url,
            "item_type": item_type,
            "market_status": "ok",
        }

    @staticmethod
    def parse_steam_item(raw: dict) -> dict:
        """
        Legacy parser for mapping simple JSON fields.
        """
        asset = raw.get("asset_description", {})
        display_name = raw.get("name", raw.get("hash_name", ""))
        item_type = asset.get("type")
        icon_url = asset.get("icon_url")
        if icon_url:
            icon_url = f"https://community.cloudflare.steamstatic.com/economy/image/{icon_url}/96fx96f"

        return {
            "market_hash_name": raw.get("hash_name", ""),
            "display_name": display_name,
            "item_type": item_type,
            "icon_url": icon_url,
        }

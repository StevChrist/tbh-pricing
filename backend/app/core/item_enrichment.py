from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def normalize_item_name(value: str | None) -> str:
    if not value:
        return ""
    normalized = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return re.sub(r"\s+", " ", normalized)


def _coalesce(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, str) and not value.strip():
        return fallback
    return value


def merge_item_payloads(
    steam_payload: dict[str, Any] | None = None,
    wiki_payload: dict[str, Any] | None = None,
    org_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    steam_payload = steam_payload or {}
    wiki_payload = wiki_payload or {}
    org_payload = org_payload or {}

    merged["market_hash_name"] = steam_payload.get("market_hash_name")
    merged["display_name"] = steam_payload.get("display_name")
    merged["item_type"] = _coalesce(steam_payload.get("item_type"), None)
    merged["icon_url"] = _coalesce(steam_payload.get("icon_url"), None)

    merged["rarity"] = _coalesce(
        _coalesce(wiki_payload.get("rarity"), org_payload.get("rarity")),
        steam_payload.get("rarity"),
    )
    merged["class_type"] = _coalesce(
        _coalesce(wiki_payload.get("class_type"), org_payload.get("class_type")),
        steam_payload.get("class_type"),
    )
    merged["gear_type"] = _coalesce(
        _coalesce(wiki_payload.get("gear_type"), org_payload.get("gear_type")),
        steam_payload.get("gear_type"),
    )
    merged["level"] = _coalesce(
        _coalesce(wiki_payload.get("level"), org_payload.get("level")),
        steam_payload.get("level"),
    )
    merged["stats"] = _coalesce(
        _coalesce(wiki_payload.get("stats"), org_payload.get("stats")),
        steam_payload.get("stats"),
    )

    return merged


def parse_wiki_catalog_entry(payload: dict[str, Any]) -> dict[str, Any]:
    """Parse a single TaskBarHero Wiki JSON catalog entry into our schema."""
    name = str(payload.get("name") or "").strip()
    grade = str(payload.get("grade") or "").strip()
    item_type = str(payload.get("type") or "").strip()
    gear_type = str(payload.get("gearType") or "").strip()
    classes = payload.get("classes") or []
    level = payload.get("level")
    stats = payload.get("stats")

    if isinstance(classes, list) and classes:
        class_type = str(classes[0]).strip()
    else:
        class_type = None

    if isinstance(stats, dict) and stats:
        stats_text = ", ".join(f"{k}: {v}" for k, v in stats.items())
    elif isinstance(stats, (list, tuple)):
        stats_text = ", ".join(str(s) for s in stats)
    elif isinstance(stats, str):
        stats_text = stats.strip()
    else:
        stats_text = None

    return {
        "display_name": name,
        "rarity": _normalize_rarity(grade),
        "item_type": _normalize_item_type(item_type),
        "class_type": class_type,
        "gear_type": _normalize_gear_type(gear_type),
        "level": int(level) if isinstance(level, (int, float)) and not isinstance(level, bool) else None,
        "stats": stats_text,
    }


def parse_taskbarhero_org_page(html: str, url: str | None = None) -> dict[str, Any]:
    """Parse a TaskBarHero.org item page into our schema using the rendered HTML."""
    text = re.sub(r"<script.*?</script>", " ", html, flags=re.I | re.S)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.I | re.S)

    title_match = re.search(r"<title>(.*?)</title>", text, flags=re.I | re.S)
    title = re.sub(r"<.*?>", " ", title_match.group(1) if title_match else "")
    title = re.sub(r"\s+", " ", title).strip()

    description_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', text, flags=re.I | re.S)
    description = re.sub(r"\s+", " ", description_match.group(1) if description_match else "")

    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", text, flags=re.I | re.S)
    name = re.sub(r"<.*?>", " ", h1_match.group(1) if h1_match else "")
    name = re.sub(r"\s+", " ", name).strip()

    rarity = _extract_label_value(text, ["rarity", "rarity:"])
    item_type = _extract_label_value(text, ["type", "item type"])
    level = _extract_level(text)
    stats = _extract_stats(text)

    if not rarity:
        rarity = _from_description(description, "rarity")
    if not item_type:
        item_type = _from_description(description, "type")
    if not name:
        name = _extract_name_from_title(title)

    return {
        "display_name": name or _extract_name_from_title(title),
        "rarity": _normalize_rarity(rarity),
        "item_type": _normalize_item_type(item_type),
        "class_type": None,
        "gear_type": None,
        "level": level,
        "stats": stats,
        "source_url": url,
    }


def _extract_label_value(html: str, labels: list[str]) -> str | None:
    for label in labels:
        pattern = rf"(?:<[^>]+>\s*)?{re.escape(label)}\s*[:\-]\s*([^<]+)"
        match = re.search(pattern, html, flags=re.I)
        if match:
            value = re.sub(r"\s+", " ", match.group(1)).strip()
            if value:
                return value
    return None


def _extract_level(html: str) -> int | None:
    match = re.search(r"\blevel\s*[:\-]\s*(\d+)", html, flags=re.I)
    if match:
        return int(match.group(1))
    return None


def _extract_stats(html: str) -> str | None:
    match = re.search(r"(?:stat group|stats)\s*[:\-]\s*([^<]+)", html, flags=re.I)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip()
    return None


def _from_description(text: str, field: str) -> str | None:
    if not text:
        return None
    if field == "rarity":
        match = re.search(r"([A-Za-z]+) rarity", text, flags=re.I)
        if match:
            return match.group(1)
    if field == "type":
        match = re.search(r"([A-Za-z ]+) type", text, flags=re.I)
        if match:
            return match.group(1)
    return None


def _extract_name_from_title(title: str) -> str | None:
    match = re.search(r"\b([A-Za-z0-9][A-Za-z0-9 .,'()/-]+?)\s*(?:—|\-|\|)", title)
    if match:
        return match.group(1).strip()
    return None


def _normalize_rarity(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    mapping = {
        "common": "Common",
        "uncommon": "Uncommon",
        "rare": "Rare",
        "legendary": "Legendary",
        "immortal": "Immortal",
        "arcana": "Arcana",
        "beyond": "Beyond",
        "celestial": "Celestial",
        "divine": "Divine",
        "cosmic": "Cosmic",
    }
    return mapping.get(normalized, value.strip().title())


def _normalize_item_type(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip()
    return cleaned.title() if cleaned else None


def _normalize_gear_type(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    mapping = {
        "amulet": "Amulet",
        "armor": "Armor",
        "arrow": "Arrow",
        "axe": "Axe",
        "bolt": "Bolt",
        "boots": "Boots",
        "bracelet": "Bracelet",
        "chest": "Chest",
        "claw": "Claw",
        "earring": "Earring",
        "gloves": "Gloves",
        "helmet": "Helmet",
        "necklace": "Necklace",
        "orb": "Orb",
        "ring": "Ring",
        "shield": "Shield",
        "sword": "Sword",
        "wand": "Wand",
        "weapon": "Weapon",
    }
    return mapping.get(normalized, value.strip().title())


async def fetch_taskbarhero_wiki_catalog() -> list[dict[str, Any]]:
    """Fetch a catalog from the public wiki JSON data feed."""
    url = "https://taskbarherowiki.com/data/items.json"
    headers = {"User-Agent": "Mozilla/5.0"}
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        response = await client.get(url)
        response.raise_for_status()
        payload = response.json()

    if isinstance(payload, dict):
        items = payload.get("items") or payload.get("data") or []
    elif isinstance(payload, list):
        items = payload
    else:
        items = []

    return [parse_wiki_catalog_entry(item) for item in items if isinstance(item, dict)]


async def fetch_taskbarhero_org_catalog() -> list[dict[str, Any]]:
    """Fetch metadata from TaskBarHero.org item detail pages using the rendered HTML."""
    sitemap_url = "https://taskbarhero.org/sitemap.xml"
    headers = {"User-Agent": "Mozilla/5.0"}
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        sitemap_response = await client.get(sitemap_url)
        sitemap_response.raise_for_status()
        sitemap_text = sitemap_response.text

    item_urls = []
    for match in re.finditer(r"<loc>(https://taskbarhero\.org/[^<]+)</loc>", sitemap_text):
        url = match.group(1)
        path = url.rstrip("/").split("https://taskbarhero.org", 1)[-1]
        segments = [segment for segment in path.split("/") if segment]
        if "/items/" in path and len(segments) >= 4 and re.search(r"\d", segments[-1]):
            item_urls.append(url)

    catalog: list[dict[str, Any]] = []
    for url in item_urls[:20]:
        try:
            async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
                response = await client.get(url)
                response.raise_for_status()
                html = response.text
            parsed = parse_taskbarhero_org_page(html, url)
            if parsed.get("display_name"):
                catalog.append(parsed)
        except Exception as exc:
            logger.warning("Failed to parse TaskBarHero.org page %s: %s", url, exc)

    return catalog


async def enrich_item_payload(
    steam_payload: dict[str, Any],
    wiki_catalog: list[dict[str, Any]],
    org_catalog: list[dict[str, Any]],
) -> dict[str, Any]:
    """Merge Steam fields with wiki/org metadata, preferring wiki and preserving existing non-empty values."""
    if not steam_payload:
        return {}

    steam_name = normalize_item_name(steam_payload.get("display_name"))
    steam_hash = (steam_payload.get("market_hash_name") or "").strip()

    wiki_match = None
    if steam_hash:
        wiki_match = next(
            (
                item
                for item in wiki_catalog
                if normalize_item_name(item.get("market_hash_name")) == normalize_item_name(steam_hash)
            ),
            None,
        )
    if not wiki_match and steam_name:
        wiki_match = next(
            (
                item
                for item in wiki_catalog
                if normalize_item_name(item.get("display_name")) == steam_name
            ),
            None,
        )

    org_match = None
    if steam_hash:
        org_match = next(
            (
                item
                for item in org_catalog
                if normalize_item_name(item.get("market_hash_name")) == normalize_item_name(steam_hash)
            ),
            None,
        )
    if not org_match and steam_name:
        org_match = next(
            (
                item
                for item in org_catalog
                if normalize_item_name(item.get("display_name")) == steam_name
            ),
            None,
        )

    merged = merge_item_payloads(steam_payload, wiki_match, org_match)

    if not any(
        [
            merged.get("rarity"),
            merged.get("class_type"),
            merged.get("gear_type"),
            merged.get("level"),
            merged.get("stats"),
        ]
    ):
        logger.warning(
            "No wiki/org metadata matched for item '%s' (%s).",
            steam_payload.get("display_name") or steam_payload.get("market_hash_name"),
            steam_hash,
        )

    return merged

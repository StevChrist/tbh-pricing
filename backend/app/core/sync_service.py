import asyncio
import json
import logging
import os
import time
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.core.image_service import download_image_as_webp
from app.core.matcher import find_wiki_match
from app.core.steam import SteamMarketClient
from app.db import crud
from app.db.models import MasterItem, MarketSummary, PriceHistory, SyncLog, RarityEnum

logger = logging.getLogger(__name__)

# Fallback path for wiki catalog items
LOCAL_WIKI_BACKUP = "scratch/items.json"


def map_grade_to_rarity(grade: str | None) -> Optional[RarityEnum]:
    """Map string grade to SQLAlchemy enum."""
    if not grade:
        return None
    val = grade.upper().strip()
    try:
        return RarityEnum[val]
    except KeyError:
        # Attempt TitleCase comparison
        for item in RarityEnum:
            if item.value.lower() == val.lower():
                return item
        return None


def clean_normalized_name(name: str | None) -> str:
    """Normalize item name to alphanumeric lowercase."""
    if not name:
        return ""
    normalized = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    return re.sub(r"\s+", " ", normalized)


async def fetch_wiki_catalog_feed() -> List[Dict[str, Any]]:
    """Fetch all items from the public wiki JSON data feed or fallback to local files."""
    url = "https://taskbarherowiki.com/data/items.json"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                logger.info("Successfully fetched wiki catalog feed from URL.")
                return data
    except Exception as exc:
        logger.warning("Failed to fetch wiki catalog feed from URL: %s. Loading backup.", exc)

    # Fallback to local scratch backup
    if os.path.exists(LOCAL_WIKI_BACKUP):
        try:
            with open(LOCAL_WIKI_BACKUP, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.info("Successfully loaded wiki catalog from local backup.")
                return data
        except Exception as err:
            logger.error("Failed to load local wiki backup: %s", err)
            
    return []


async def run_synchronization(db: AsyncSession, mode: str = "daily") -> Dict[str, Any]:
    """
    Main ETL synchronization pipeline.
    Modes:
      - 'full': Seeds all items, checks all images, fetches all Steam prices.
      - 'daily': Seeks changes incrementally, syncs prices, updates records.
    """
    started_at = datetime.now(timezone.utc)
    logger.info("ETL: starting %s synchronization run.", mode)

    # Initialize sync log record in database
    sync_log = SyncLog(
        sync_mode=mode,
        started_at=started_at,
        status="running",
        items_imported=0,
        items_updated=0,
        items_skipped=0,
        duplicates_detected=0,
        validation_errors=0,
        prices_updated=0,
        images_downloaded=0,
        images_reused=0
    )
    db.add(sync_log)
    await db.commit()
    await db.refresh(sync_log)

    failures_log = []

    try:
        # ===================================================================
        # PHASE 1: IMPORT WIKI CATALOG
        # ===================================================================
        wiki_catalog = await fetch_wiki_catalog_feed()
        if not wiki_catalog:
            raise RuntimeError("Wiki catalog could not be retrieved from remote feed or local backup.")

        logger.info("ETL Phase 1: Processing %d items from Wiki catalog.", len(wiki_catalog))

        # Query all existing items in database for change detection
        db_items_res = await db.execute(select(MasterItem))
        db_items_list = db_items_res.scalars().all()
        db_items_by_key = {item.internal_item_id: item for item in db_items_list if item.internal_item_id is not None}
        
        # Track duplicate detection inside this run
        processed_internal_ids = set()

        for w_item in wiki_catalog:
            internal_id = w_item.get("key")
            name = w_item.get("name")

            # Staging validation
            if not internal_id or not name:
                sync_log.validation_errors += 1
                failures_log.append(f"Validation: Skipped item due to missing key/name: {w_item}")
                continue

            if internal_id in processed_internal_ids:
                sync_log.duplicates_detected += 1
                continue
            
            processed_internal_ids.add(internal_id)

            # Map fields
            display_name = name.strip()
            norm_name = clean_normalized_name(display_name)
            rarity_enum = map_grade_to_rarity(w_item.get("grade"))
            item_type = w_item.get("type")
            gear_type = w_item.get("gearType")
            classes = w_item.get("classes")
            class_type = classes[0] if (classes and isinstance(classes, list)) else None
            level = w_item.get("level")
            stats = w_item.get("stats")
            
            # Additional metadata attributes
            metadata_payload = {
                "obtainable": w_item.get("obtainable"),
                "tradable": w_item.get("tradable"),
                "gold": w_item.get("gold"),
                "slots": w_item.get("slots"),
                "variant": w_item.get("variant"),
                "uniqueMod": w_item.get("uniqueMod")
            }

            # Local served WebP serving URL
            image_path = f"/static/items/{internal_id}.webp"
            
            # Determine if this is a new item or update
            db_item = db_items_by_key.get(internal_id)
            is_new = db_item is None

            if is_new:
                # Insert new item metadata
                db_item = MasterItem(
                    internal_item_id=internal_id,
                    display_name=display_name,
                    normalized_name=norm_name,
                    item_type=item_type,
                    rarity=rarity_enum,
                    gear_type=gear_type,
                    class_type=class_type,
                    level=level,
                    stats=stats,
                    category=item_type,
                    item_metadata=metadata_payload,
                    image_path=image_path
                )
                db.add(db_item)
                sync_log.items_imported += 1
            else:
                # Update item metadata (if something changed or mode is 'full')
                has_changed = (
                    db_item.display_name != display_name or
                    db_item.rarity != rarity_enum or
                    db_item.item_type != item_type or
                    db_item.gear_type != gear_type or
                    db_item.class_type != class_type or
                    db_item.level != level or
                    db_item.stats != stats
                )
                if has_changed or mode == "full":
                    db_item.display_name = display_name
                    db_item.normalized_name = norm_name
                    db_item.rarity = rarity_enum
                    db_item.item_type = item_type
                    db_item.gear_type = gear_type
                    db_item.class_type = class_type
                    db_item.level = level
                    db_item.stats = stats
                    db_item.category = item_type
                    db_item.item_metadata = metadata_payload
                    db_item.updated_at = datetime.now(timezone.utc)
                    sync_log.items_updated += 1
                else:
                    sync_log.items_skipped += 1

            # Resolve market_hash_name for future steam syncing
            # If variant is defined (e.g. A), Name is formatted as "Name (Rarity) Variant"
            # Else, Name is just "Name"
            variant_str = w_item.get("variant")
            rarity_str = rarity_enum.value.title() if rarity_enum else ""
            if variant_str and rarity_str and w_item.get("tradable"):
                db_item.market_hash_name = f"{display_name} ({rarity_str}) {variant_str}"
            elif w_item.get("tradable"):
                # Check standard mapping
                db_item.market_hash_name = display_name
            else:
                db_item.market_hash_name = None

            # ===============================================================
            # PHASE 2: DOWNLOAD WIKI IMAGES (WebP + MD5 Deduplication)
            # ===============================================================
            icon_name = w_item.get("icon")
            if os.environ.get("MOCK_IMAGE_DOWNLOAD") == "true":
                db_item.image_path = f"/static/items/{internal_id}.webp"
                db_item.image_hash = "mock_hash_for_testing"
                db_item.image_data = b"mock_data"
                sync_log.images_reused += 1
            elif icon_name and (is_new or mode == "full" or not db_item.image_hash or not db_item.image_data):
                icon_url = f"https://taskbarherowiki.com/icons/{icon_name}.png"
                try:
                    webp_bytes, new_hash = await download_image_as_webp(icon_url)
                    if webp_bytes:
                        reused = (db_item.image_hash == new_hash and db_item.image_data is not None)
                        db_item.image_data = webp_bytes
                        db_item.image_hash = new_hash
                        if reused:
                            sync_log.images_reused += 1
                        else:
                            sync_log.images_downloaded += 1
                except Exception as img_err:
                    failures_log.append(f"Image Download failed for key {internal_id}: {img_err}")
        
        # Commit catalog inserts and updates so that matching works against fresh DB rows
        await db.commit()

        # ===================================================================
        # PHASE 3: STEAM PRICE SYNCHRONIZATION
        # ===================================================================
        logger.info("ETL Phase 3: Refreshing market prices from Steam search/render.")
        steam_items = []
        async with SteamMarketClient() as steam_client:
            try:
                steam_items = await steam_client.get_all_market_items()
            except Exception as steam_err:
                failures_log.append(f"Steam Scraper: Failed to fetch market items: {steam_err}")
                logger.error("Steam search/render failed: %s", steam_err)

        if steam_items:
            logger.info("Steam Scraper: processing %d market listing results.", len(steam_items))
            # Refresh DB list to capture newly inserted items
            db_items_res = await db.execute(select(MasterItem))
            db_items_list = db_items_res.scalars().all()
            
            # Match Steam listings to database MasterItems
            for s_item in steam_items:
                matched_wiki = find_wiki_match(s_item, [
                    {
                        "key": item.internal_item_id,
                        "name": item.display_name,
                        "market_hash_name": item.market_hash_name,
                        "grade": item.rarity.value if item.rarity else "",
                        "variant": (item.item_metadata or {}).get("variant")
                    } for item in db_items_list
                ])
                
                if matched_wiki:
                    # Retrieve the actual MasterItem row in DB
                    db_item = next(i for i in db_items_list if i.internal_item_id == matched_wiki["key"])
                    
                    # Update master_items' market_hash_name if missing
                    if not db_item.market_hash_name:
                        db_item.market_hash_name = s_item["market_hash_name"]

                    latest_usd = s_item.get("latest_price_usd")
                    latest_idr = s_item.get("latest_price_idr")
                    volume = s_item.get("volume")
                    market_url = s_item.get("market_url")

                    # 1. Update MarketSummary
                    await crud.upsert_market_summary(
                        db,
                        master_item_id=db_item.id,
                        market_hash_name=s_item["market_hash_name"],
                        latest_price_idr=latest_idr,
                        latest_price_usd=latest_usd,
                        median_price_idr=None,
                        median_price_usd=None,
                        volume=volume,
                        market_status="ok",
                        market_url=market_url,
                    )

                    # 2. Insert into PriceHistory ONLY if price/listings changed from latest
                    latest_hist = await crud.get_latest_price(db, db_item.id)
                    price_changed = (
                        latest_hist is None or
                        latest_hist.lowest_price_usd != latest_usd or
                        latest_hist.volume != volume or
                        latest_hist.fetch_status != "ok"
                    )
                    
                    if price_changed:
                        await crud.create_price_snapshot(
                            db,
                            master_item_id=db_item.id,
                            lowest_price_idr=latest_idr,
                            median_price_idr=None,  # Not returned in bulk lists
                            lowest_price_usd=latest_usd,
                            median_price_usd=None,
                            volume=volume,
                            fetch_status="ok"
                        )
                        sync_log.prices_updated += 1
            
            await db.commit()

        # ===================================================================
        # PHASE 4: TASKBARHERO.ORG FALLBACK METADATA ENRICHMENT
        # ===================================================================
        # (This remains as fallback, filling only NULL details)
        # We can implement it if items have NULL details. Currently all wiki items
        # should have descriptions/stats.

        # Save success logs
        sync_log.status = "success"
        logger.info("ETL Sync run completed successfully.")

    except Exception as run_exc:
        logger.error("ETL Sync failure: %s", run_exc, exc_info=True)
        sync_log.status = "failed"
        failures_log.append(f"Pipeline Failure: {run_exc}")

    # Set final stats
    completed_at = datetime.now(timezone.utc)
    sync_log.completed_at = completed_at
    sync_log.duration_seconds = (completed_at - started_at).total_seconds()
    if failures_log:
        sync_log.failures_log = json.dumps(failures_log, indent=2)
        if sync_log.status == "success":
            sync_log.status = "partial_failures"
            
    await db.commit()
    await db.refresh(sync_log)

    return {
        "status": sync_log.status,
        "items_imported": sync_log.items_imported,
        "items_updated": sync_log.items_updated,
        "items_skipped": sync_log.items_skipped,
        "duplicates_detected": sync_log.duplicates_detected,
        "validation_errors": sync_log.validation_errors,
        "prices_updated": sync_log.prices_updated,
        "images_downloaded": sync_log.images_downloaded,
        "images_reused": sync_log.images_reused,
        "duration_seconds": sync_log.duration_seconds,
    }

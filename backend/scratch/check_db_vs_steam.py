import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import AsyncSessionLocal
from app.db.models import MasterItem
from sqlalchemy import select
from app.core.steam import SteamMarketClient

def map_grade_to_rarity_str(grade: str | None) -> str:
    if not grade:
        return ""
    val = grade.upper().strip()
    return val.title()

async def get_items_from_db():
    try:
        async with AsyncSessionLocal() as session:
            print("Connecting to database to fetch items...")
            stmt = select(MasterItem).where(MasterItem.market_hash_name.is_not(None))
            res = await session.execute(stmt)
            db_items_list = res.scalars().all()
            
            db_items = {}
            for item in db_items_list:
                db_items[item.market_hash_name] = {
                    "key": item.internal_item_id,
                    "display_name": item.display_name,
                    "grade": item.rarity.value if item.rarity else None,
                    "variant": (item.item_metadata or {}).get("variant")
                }
            return db_items
    except Exception as exc:
        print(f"Database connection failed or table does not exist: {exc}")
        print("Falling back to scratch/items.json...")
        return None

async def main():
    db_items = await get_items_from_db()
    if db_items is None:
        if not os.path.exists("scratch/items.json"):
            print("Error: scratch/items.json not found.")
            return

        with open("scratch/items.json", "r", encoding="utf-8") as f:
            items_data = json.load(f)

        db_items = {}
        for item in items_data:
            if not item.get("tradable"):
                continue
            
            display_name = item.get("name", "").strip()
            variant_str = item.get("variant")
            rarity_str = map_grade_to_rarity_str(item.get("grade"))
            
            if variant_str and rarity_str:
                market_hash_name = f"{display_name} ({rarity_str}) {variant_str}"
            else:
                market_hash_name = display_name
                
            db_items[market_hash_name] = {
                "key": item.get("key"),
                "display_name": display_name,
                "grade": item.get("grade"),
                "variant": variant_str,
            }

    print(f"Total tradable items in catalog: {len(db_items)}")

    print("Fetching all items currently listed on Steam Market...")
    async with SteamMarketClient() as client:
        steam_items_raw = await client.get_all_market_items()

    steam_items = {}
    for s in steam_items_raw:
        hash_name = s.get("market_hash_name")
        steam_items[hash_name] = s

    print(f"Total items found on Steam Market: {len(steam_items)}")

    missing_on_steam = []
    for hash_name, db_info in db_items.items():
        if hash_name not in steam_items:
            missing_on_steam.append({
                "market_hash_name": hash_name,
                "key": db_info["key"],
                "display_name": db_info["display_name"],
                "grade": db_info["grade"],
                "variant": db_info["variant"]
            })

    extra_on_steam = []
    for hash_name, steam_info in steam_items.items():
        if hash_name not in db_items:
            extra_on_steam.append({
                "market_hash_name": hash_name,
                "display_name": steam_info.get("display_name"),
            })

    print(f"\nResults:")
    print(f"  - Items in DB but missing on Steam: {len(missing_on_steam)}")
    print(f"  - Items on Steam but missing in DB: {len(extra_on_steam)}")

    os.makedirs("scratch", exist_ok=True)

    with open("scratch/missing_on_steam.json", "w", encoding="utf-8") as f:
        json.dump(missing_on_steam, f, indent=2)
    print("Saved details of items missing on Steam to scratch/missing_on_steam.json")

    with open("scratch/extra_on_steam.json", "w", encoding="utf-8") as f:
        json.dump(extra_on_steam, f, indent=2)
    print("Saved details of extra items on Steam to scratch/extra_on_steam.json")

    if missing_on_steam:
        print("\nExamples of items in DB but missing on Steam (up to 20):")
        for x in missing_on_steam[:20]:
            print(f"  - {x['market_hash_name']} (Key: {x['key']})")

    if extra_on_steam:
        print("\nExamples of extra items on Steam not in DB (up to 20):")
        for x in extra_on_steam[:20]:
            print(f"  - {x['market_hash_name']}")

if __name__ == "__main__":
    asyncio.run(main())

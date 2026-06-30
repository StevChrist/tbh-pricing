import asyncio
import json
import sys
import os
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from app.db.database import AsyncSessionLocal
from app.db.models import MasterItem
from app.core.item_enrichment import normalize_item_name

def parse_steam_name(name):
    # Match: "Name (Rarity) Variant" e.g. "Knight Boots (Arcana) A"
    match = re.match(r"^(.+?)\s*\(([^)]+)\)\s+([A-Z])$", name)
    if match:
        return {
            "name": match.group(1).strip(),
            "rarity": match.group(2).strip(),
            "variant": match.group(3).strip()
        }
    # Match: "Name (Rarity)" e.g. "Knight Boots (Arcana)"
    match = re.match(r"^(.+?)\s*\(([^)]+)\)$", name)
    if match:
        return {
            "name": match.group(1).strip(),
            "rarity": match.group(2).strip(),
            "variant": None
        }
    return {
        "name": name.strip(),
        "rarity": None,
        "variant": None
    }

async def main():
    print("Loading items.json...")
    with open("scratch/items.json", "r", encoding="utf-8") as f:
        wiki_items = json.load(f)

    # Build index maps
    wiki_by_name = {}
    for w in wiki_items:
        norm = normalize_item_name(w.get("name"))
        if norm:
            wiki_by_name.setdefault(norm, []).append(w)

    async with AsyncSessionLocal() as session:
        print("Fetching existing master_items from DB...")
        result = await session.execute(select(MasterItem))
        db_items = result.scalars().all()
        print(f"Loaded {len(db_items)} items from database.")

        updated_count = 0

        for item in db_items:
            name_to_parse = item.market_hash_name
            parsed = parse_steam_name(name_to_parse)
            
            norm_name = normalize_item_name(parsed["name"])
            candidates = wiki_by_name.get(norm_name, [])
            
            match = None
            if len(candidates) == 1:
                match = candidates[0]
            elif len(candidates) > 1:
                # Filter by rarity
                rarity = parsed["rarity"]
                variant = parsed["variant"]
                
                filtered = candidates
                if rarity:
                    filtered = [c for c in filtered if c.get("grade", "").lower() == rarity.lower()]
                if variant:
                    filtered = [c for c in filtered if c.get("variant") == variant]
                else:
                    filtered = [c for c in filtered if c.get("variant") in (None, "")]
                
                if len(filtered) == 1:
                    match = filtered[0]
            
            if not match:
                print(f"CRITICAL: Failed to find wiki match for DB item: {item.market_hash_name}")
                continue

            # Populate metadata
            item.internal_item_id = match.get("key")
            item.normalized_name = normalize_item_name(item.display_name)
            item.class_type = match.get("classes")[0] if (match.get("classes") and isinstance(match.get("classes"), list)) else None
            item.level = match.get("level")
            item.stats = match.get("stats")
            item.category = match.get("type")
            item.image_path = f"/static/items/{match.get('key')}.webp"
            
            # Setup metadata dictionary
            item.item_metadata = {
                "obtainable": match.get("obtainable"),
                "tradable": match.get("tradable"),
                "gold": match.get("gold"),
                "slots": match.get("slots"),
                "variant": match.get("variant"),
                "uniqueMod": match.get("uniqueMod")
            }
            
            updated_count += 1

        print(f"Updating {updated_count} / {len(db_items)} items...")
        await session.commit()
        print("Database commit successful! Mapping complete.")

if __name__ == "__main__":
    asyncio.run(main())

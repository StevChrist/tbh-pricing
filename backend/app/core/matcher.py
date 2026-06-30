import re
import difflib
import logging
from typing import List, Dict, Any, Optional
from app.core.item_enrichment import normalize_item_name

logger = logging.getLogger(__name__)

def parse_steam_name(name: str) -> Dict[str, Optional[str]]:
    """
    Parse a Steam listing name to extract base name, rarity/grade, and variant.
    
    Examples:
      - "Knight Boots (Arcana) A" -> {"name": "Knight Boots", "rarity": "Arcana", "variant": "A"}
      - "Frozen Orb (Arcana)"     -> {"name": "Frozen Orb", "rarity": "Arcana", "variant": None}
      - "Iron Ore"                 -> {"name": "Iron Ore", "rarity": None, "variant": None}
    """
    # 1. Match: "Name (Rarity) Variant" e.g., "Knight Boots (Arcana) A"
    match = re.match(r"^(.+?)\s*\(([^)]+)\)\s+([A-Z])$", name)
    if match:
        return {
            "name": match.group(1).strip(),
            "rarity": match.group(2).strip(),
            "variant": match.group(3).strip()
        }
    # 2. Match: "Name (Rarity)" e.g., "Frozen Orb (Arcana)"
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

def find_wiki_match(
    steam_item: Dict[str, Any],
    wiki_items: List[Dict[str, Any]],
    fuzzy_threshold: float = 0.90
) -> Optional[Dict[str, Any]]:
    """
    Match a Steam item to a Wiki item using the prioritized strategy:
    1. internal_item_id
    2. market_hash_name
    3. normalized_display_name
    4. Conservative fuzzy matching
    
    Returns the matched Wiki item or None if no high-confidence match is found.
    """
    steam_hash = steam_item.get("market_hash_name") or steam_item.get("hash_name") or ""
    steam_display = steam_item.get("display_name") or steam_item.get("name") or ""
    
    # 1. Match by internal_item_id if available
    steam_internal_id = steam_item.get("internal_item_id") or steam_item.get("key")
    if steam_internal_id:
        for wiki in wiki_items:
            if wiki.get("key") == steam_internal_id:
                return wiki

    # 2. Match by exact market_hash_name match (or exact display name match against wiki name)
    if steam_hash:
        for wiki in wiki_items:
            wiki_hash = wiki.get("market_hash_name")
            if wiki_hash and wiki_hash.lower() == steam_hash.lower():
                return wiki
                
    # 3. Match by normalized display name (parsing out rarity and variant)
    parsed = parse_steam_name(steam_hash or steam_display)
    norm_parsed_name = normalize_item_name(parsed["name"])
    
    candidates = []
    for wiki in wiki_items:
        wiki_norm = normalize_item_name(wiki.get("name"))
        if wiki_norm == norm_parsed_name:
            candidates.append(wiki)
            
    if len(candidates) == 1:
        return candidates[0]
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
            # If no variant parsed, look for variant-less items
            filtered = [c for c in filtered if c.get("variant") in (None, "")]
            
        if len(filtered) == 1:
            return filtered[0]

    # 4. Conservative fuzzy matching
    # Iterate over all items in wiki and find the best match for the normalized parsed name
    best_match = None
    best_ratio = 0.0
    
    for wiki in wiki_items:
        wiki_norm = normalize_item_name(wiki.get("name"))
        ratio = difflib.SequenceMatcher(None, norm_parsed_name, wiki_norm).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = wiki
            
    if best_ratio >= fuzzy_threshold:
        # Filter matching candidates if we have multiple similar ones
        similar_candidates = [
            w for w in wiki_items 
            if difflib.SequenceMatcher(None, norm_parsed_name, normalize_item_name(w.get("name"))).ratio() >= fuzzy_threshold
        ]
        
        # Apply grade/variant filter on the fuzzy candidates to narrow down
        rarity = parsed["rarity"]
        variant = parsed["variant"]
        if rarity:
            similar_candidates = [c for c in similar_candidates if c.get("grade", "").lower() == rarity.lower()]
        if variant:
            similar_candidates = [c for c in similar_candidates if c.get("variant") == variant]
        else:
            similar_candidates = [c for c in similar_candidates if c.get("variant") in (None, "")]
            
        if len(similar_candidates) == 1:
            logger.info("Fuzzy matched '%s' -> '%s' (Confidence: %.2f)", steam_display, similar_candidates[0].get("name"), best_ratio)
            return similar_candidates[0]

    # Low confidence or unambiguous candidates
    logger.warning("Unmatched Steam item: '%s' (Parsed name: '%s', rarity: %s, variant: %s)", steam_display, parsed["name"], parsed["rarity"], parsed["variant"])
    return None

import unittest

from app.core.item_enrichment import (
    merge_item_payloads,
    normalize_item_name,
    parse_taskbarhero_org_page,
    parse_wiki_catalog_entry,
)


class ItemEnrichmentTestCase(unittest.TestCase):
    def test_normalize_item_name_removes_punctuation_and_case(self) -> None:
        self.assertEqual(normalize_item_name("Sword of the Dawn!"), "sword of the dawn")

    def test_merge_prefers_wiki_values_and_keeps_existing_values(self) -> None:
        steam_payload = {
            "market_hash_name": "SteamItem",
            "display_name": "Golden Sword",
            "item_type": "Sword",
            "rarity": "Common",
            "gear_type": "Weapons",
            "icon_url": "https://steam/icon.png",
            "class_type": None,
            "level": None,
            "stats": None,
        }
        wiki_payload = {
            "rarity": "Legendary",
            "class_type": "Knight",
            "gear_type": "Sword",
            "level": 50,
            "stats": "+20 Damage",
        }
        org_payload = {
            "rarity": "Immortal",
            "class_type": "Ranger",
            "gear_type": "Axe",
            "level": 99,
            "stats": "+99 Damage",
        }

        merged = merge_item_payloads(steam_payload, wiki_payload, org_payload)

        self.assertEqual(merged["market_hash_name"], "SteamItem")
        self.assertEqual(merged["display_name"], "Golden Sword")
        self.assertEqual(merged["rarity"], "Legendary")
        self.assertEqual(merged["class_type"], "Knight")
        self.assertEqual(merged["gear_type"], "Sword")
        self.assertEqual(merged["level"], 50)
        self.assertEqual(merged["stats"], "+20 Damage")
        self.assertEqual(merged["icon_url"], "https://steam/icon.png")

    def test_merge_does_not_overwrite_existing_values_with_none(self) -> None:
        steam_payload = {
            "market_hash_name": "SteamItem",
            "display_name": "Golden Sword",
            "item_type": "Sword",
            "rarity": "Rare",
            "gear_type": "Weapons",
            "icon_url": "https://steam/icon.png",
            "class_type": "Knight",
            "level": 30,
            "stats": "+5 Damage",
        }
        wiki_payload = {
            "rarity": None,
            "class_type": None,
            "gear_type": None,
            "level": None,
            "stats": None,
        }
        org_payload = {
            "rarity": None,
            "class_type": None,
            "gear_type": None,
            "level": None,
            "stats": None,
        }

        merged = merge_item_payloads(steam_payload, wiki_payload, org_payload)

        self.assertEqual(merged["rarity"], "Rare")
        self.assertEqual(merged["class_type"], "Knight")
        self.assertEqual(merged["gear_type"], "Weapons")
        self.assertEqual(merged["level"], 30)
        self.assertEqual(merged["stats"], "+5 Damage")

    def test_parse_wiki_catalog_entry_maps_json_payload(self) -> None:
        payload = {
            "name": "Ruby",
            "type": "MATERIAL",
            "grade": "RARE",
            "gearType": "AMULET",
            "classes": ["Knight"],
            "level": 15,
            "stats": {"damage": 10},
            "key": 112001,
        }

        parsed = parse_wiki_catalog_entry(payload)

        self.assertEqual(parsed["display_name"], "Ruby")
        self.assertEqual(parsed["rarity"], "Rare")
        self.assertEqual(parsed["item_type"], "Material")
        self.assertEqual(parsed["gear_type"], "Amulet")
        self.assertEqual(parsed["class_type"], "Knight")
        self.assertEqual(parsed["level"], 15)
        self.assertEqual(parsed["stats"], "damage: 10")

    def test_parse_taskbarhero_org_page_extracts_metadata(self) -> None:
        html = """
        <html><head>
          <title>112001 Ruby — Material Stats, Type &amp; Rarity</title>
          <meta name="description" content="112001 Ruby material page for TBH: Task Bar Hero: Rare rarity, Decoration type, icon, stat group and related materials." />
        </head><body>
          <h1>Ruby</h1>
          <div>Rarity: Rare</div>
          <div>Type: Decoration</div>
          <div>Level: 15</div>
          <div>Stat Group: +10 Damage</div>
        </body></html>
        """

        parsed = parse_taskbarhero_org_page(html, "https://taskbarhero.org/en/items/materials/112001-ruby/")

        self.assertEqual(parsed["display_name"], "Ruby")
        self.assertEqual(parsed["rarity"], "Rare")
        self.assertEqual(parsed["item_type"], "Decoration")
        self.assertEqual(parsed["level"], 15)
        self.assertEqual(parsed["stats"], "+10 Damage")


if __name__ == "__main__":
    unittest.main()

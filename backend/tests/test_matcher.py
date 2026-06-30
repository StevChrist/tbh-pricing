import unittest
from app.core.matcher import parse_steam_name, find_wiki_match

class MatcherTestCase(unittest.TestCase):
    def test_parse_steam_name_variant(self) -> None:
        parsed = parse_steam_name("Knight Boots (Arcana) A")
        self.assertEqual(parsed["name"], "Knight Boots")
        self.assertEqual(parsed["rarity"], "Arcana")
        self.assertEqual(parsed["variant"], "A")

    def test_parse_steam_name_no_variant(self) -> None:
        parsed = parse_steam_name("Frozen Orb (Arcana)")
        self.assertEqual(parsed["name"], "Frozen Orb")
        self.assertEqual(parsed["rarity"], "Arcana")
        self.assertIsNone(parsed["variant"])

    def test_parse_steam_name_simple(self) -> None:
        parsed = parse_steam_name("Iron Ore")
        self.assertEqual(parsed["name"], "Iron Ore")
        self.assertIsNone(parsed["rarity"])
        self.assertIsNone(parsed["variant"])

    def test_find_wiki_match_by_name(self) -> None:
        wiki_items = [
            {"key": 1001, "name": "Iron Ore", "grade": "COMMON", "variant": None},
            {"key": 1002, "name": "Long Sword", "grade": "COMMON", "variant": None},
        ]
        steam_item = {"hash_name": "Iron Ore"}
        match = find_wiki_match(steam_item, wiki_items)
        self.assertIsNotNone(match)
        self.assertEqual(match["key"], 1001)

    def test_find_wiki_match_by_rarity_and_variant(self) -> None:
        wiki_items = [
            {"key": 2001, "name": "Knight Boots", "grade": "COMMON", "variant": None},
            {"key": 2002, "name": "Knight Boots", "grade": "ARCANA", "variant": "A"},
            {"key": 2003, "name": "Knight Boots", "grade": "ARCANA", "variant": "B"},
        ]
        steam_item = {"hash_name": "Knight Boots (Arcana) A"}
        match = find_wiki_match(steam_item, wiki_items)
        self.assertIsNotNone(match)
        self.assertEqual(match["key"], 2002)

    def test_find_wiki_match_fuzzy(self) -> None:
        wiki_items = [
            {"key": 3001, "name": "Bastard Sword", "grade": "COMMON", "variant": None},
        ]
        steam_item = {"hash_name": "Bastard Swrd"}
        match = find_wiki_match(steam_item, wiki_items, fuzzy_threshold=0.8)
        self.assertIsNotNone(match)
        self.assertEqual(match["key"], 3001)

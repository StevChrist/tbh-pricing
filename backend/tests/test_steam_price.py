import unittest
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi import HTTPException, status
from app.core.steam import SteamMarketClient
from app.api.routes.prices import refresh_single_item
from app.db.models import User, MasterItem

class TestSteamPriceHandling(unittest.IsolatedAsyncioTestCase):
    async def test_get_item_price_none(self) -> None:
        """Test that get_item_price returns unavailable without calling steam when market_hash_name is None."""
        async with SteamMarketClient() as client:
            result = await client.get_item_price(None)
            self.assertEqual(result["fetch_status"], "unavailable")
            self.assertIsNone(result["lowest_price_idr"])
            self.assertIsNone(result["median_price_idr"])

    async def test_get_item_price_empty(self) -> None:
        """Test that get_item_price returns unavailable without calling steam when market_hash_name is empty."""
        async with SteamMarketClient() as client:
            result = await client.get_item_price("")
            self.assertEqual(result["fetch_status"], "unavailable")
            self.assertIsNone(result["lowest_price_idr"])
            self.assertIsNone(result["median_price_idr"])

    async def test_refresh_single_item_missing_hash_name_raises_400(self) -> None:
        """Test that refresh_single_item raises 400 Bad Request if the item has no market_hash_name."""
        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_user = User(id=1, username="admin_user", role="admin")

        item_without_hash = MasterItem(
            id=123,
            display_name="Untradable Sword",
            market_hash_name=None
        )

        with patch("app.db.crud.get_master_item_by_id", new_callable=AsyncMock, return_value=item_without_hash):
            with self.assertRaises(HTTPException) as ctx:
                await refresh_single_item(
                    master_item_id=123,
                    request=mock_request,
                    db=mock_db,
                    _=mock_user
                )
            
            self.assertEqual(ctx.exception.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("not tradable", ctx.exception.detail)

if __name__ == "__main__":
    unittest.main()

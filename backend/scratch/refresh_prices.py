"""Trigger a manual price refresh and verify the updated IDR prices."""
import asyncio
import httpx


async def main():
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Login
        login = await client.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"username": "admin", "password": "admin"},
        )
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Trigger refresh
        print("Triggering price refresh...")
        r = await client.post(
            "http://localhost:8000/api/v1/prices/refresh",
            headers=headers,
        )
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")

        # Check inventory
        print("\nFetching inventory to verify prices...")
        inv = await client.get(
            "http://localhost:8000/api/v1/inventory",
            headers=headers,
        )
        for item in inv.json():
            mi = item["master_item"]
            lp = item.get("latest_price")
            price_idr = lp.get("lowest_price_idr") if lp else None
            price_usd = lp.get("lowest_price_usd") if lp else None
            print(f"  {mi['display_name']}: IDR={price_idr}, USD={price_usd}")


if __name__ == "__main__":
    asyncio.run(main())

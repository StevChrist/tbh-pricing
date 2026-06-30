"""Quick script to update steam_currency_idr setting from 9 to 10."""
import asyncio
from app.db.database import AsyncSessionLocal
from app.db import crud


async def main():
    async with AsyncSessionLocal() as db:
        old = await crud.get_setting(db, "steam_currency_idr")
        print(f"Current steam_currency_idr = {old}")
        await crud.set_setting(db, "steam_currency_idr", "10")
        await db.commit()
        new = await crud.get_setting(db, "steam_currency_idr")
        print(f"Updated steam_currency_idr = {new}")


if __name__ == "__main__":
    asyncio.run(main())

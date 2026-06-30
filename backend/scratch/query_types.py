import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import AsyncSessionLocal
from app.db.models import MasterItem
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        res3 = await session.execute(select(MasterItem.class_type).distinct())
        classes = [r[0] for r in res3.fetchall()]
        print("Distinct class_type in database:")
        for c in classes:
            print(f"  - {c}")
            
        res4 = await session.execute(select(MasterItem.gear_type).distinct())
        gears = [r[0] for r in res4.fetchall()]
        print("Distinct gear_type in database:")
        for g in gears:
            print(f"  - {g}")

if __name__ == "__main__":
    asyncio.run(main())

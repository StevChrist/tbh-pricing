import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import AsyncSessionLocal
from app.core.sync_service import run_synchronization

async def main():
    print("Connecting to database and running sync in 'daily' mode...")
    async with AsyncSessionLocal() as session:
        result = await run_synchronization(session, mode="daily")
        print("\nSync Results:")
        for k, v in result.items():
            print(f"  {k}: {v}")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import AsyncSessionLocal
from app.core.sync_service import run_synchronization

async def main():
    print("Starting weekly full database update & synchronization (mode='full')...")
    async with AsyncSessionLocal() as session:
        # Runs the ETL pipeline in 'full' mode (seeding items, downloading images, and updating)
        result = await run_synchronization(session, mode="full")
        print("\nSynchronization complete. Results:")
        for k, v in result.items():
            print(f"  {k}: {v}")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import AsyncSessionLocal
from app.db.models import SyncLog
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SyncLog))
        logs = result.scalars().all()
        print(f"Total sync logs: {len(logs)}")
        for log in logs:
            print(f"ID: {log.id}")
            print(f"  Mode: {log.sync_mode}")
            print(f"  Started: {log.started_at}")
            print(f"  Status: {log.status}")
            print(f"  Imported: {log.items_imported}")
            print(f"  Updated: {log.items_updated}")
            print(f"  Skipped: {log.items_skipped}")
            print(f"  Validation Errors: {log.validation_errors}")
            print(f"  Failures Log: {log.failures_log}")

if __name__ == "__main__":
    asyncio.run(main())

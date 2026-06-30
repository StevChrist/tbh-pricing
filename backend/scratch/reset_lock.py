import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import AsyncSessionLocal
from app.db.models import SyncLog
from app.db import crud
from sqlalchemy import update

async def main():
    async with AsyncSessionLocal() as session:
        # Reset is_running setting
        await crud.set_setting(session, "is_running", "false")
        
        # Mark running logs as failed
        await session.execute(
            update(SyncLog)
            .where(SyncLog.status == "running")
            .values(status="failed", failures_log="Test run terminated by user.")
        )
        await session.commit()
        print("Scheduler lock and sync logs reset completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())

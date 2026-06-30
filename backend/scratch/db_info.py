import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.database import AsyncSessionLocal, engine

async def main():
    print("Connecting to database...")
    async with AsyncSessionLocal() as session:
        # Get list of tables
        result = await session.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
        ))
        tables = [row[0] for row in result.fetchall()]
        print(f"Tables found: {tables}")

        for table in tables:
            count_res = await session.execute(text(f"SELECT COUNT(*) FROM {table};"))
            count = count_res.scalar()
            print(f"Table '{table}': {count} records")
            
            # Print columns
            col_res = await session.execute(text(
                f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{table}';"
            ))
            cols = [f"{row[0]} ({row[1]})" for row in col_res.fetchall()]
            print(f"  Columns: {', '.join(cols)}")

if __name__ == "__main__":
    asyncio.run(main())

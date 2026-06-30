"""
Database migration script to add gear_type column and seed/update master items.
"""

import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

def run_migration():
    db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data")
    db_path = os.path.join(db_dir, "tbh.db")
    print(f"Running migration on database: {db_path}")

    if not os.path.exists(db_path):
        print("Database file does not exist yet. Skip schema modification.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check columns of master_items
    cursor.execute("PRAGMA table_info(master_items);")
    columns = [row[1] for row in cursor.fetchall()]

    if "gear_type" not in columns:
        print("Adding column 'gear_type' to table 'master_items'...")
        cursor.execute("ALTER TABLE master_items ADD COLUMN gear_type VARCHAR(64);")
        conn.commit()
        print("Column 'gear_type' successfully added.")
    else:
        print("Column 'gear_type' already exists in 'master_items'.")

    conn.close()

if __name__ == "__main__":
    run_migration()

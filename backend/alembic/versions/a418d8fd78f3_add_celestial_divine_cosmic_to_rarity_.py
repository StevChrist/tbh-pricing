"""add_celestial_divine_cosmic_to_rarity_enum

Revision ID: a418d8fd78f3
Revises: fb23dc6574fb
Create Date: 2026-06-28 01:54:48.440960

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a418d8fd78f3'
down_revision: Union[str, Sequence[str], None] = 'fb23dc6574fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE rarity_enum ADD VALUE IF NOT EXISTS 'CELESTIAL'")
        op.execute("ALTER TYPE rarity_enum ADD VALUE IF NOT EXISTS 'DIVINE'")
        op.execute("ALTER TYPE rarity_enum ADD VALUE IF NOT EXISTS 'COSMIC'")


def downgrade() -> None:
    """Downgrade schema."""
    pass

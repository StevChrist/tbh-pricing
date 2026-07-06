"""add_user_otps_table

Revision ID: c9e3f1a847d2
Revises: a418d8fd78f3
Create Date: 2026-07-06 15:48:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c9e3f1a847d2'
down_revision: Union[str, Sequence[str], None] = 'a418d8fd78f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_otps table and otp_purpose_enum type."""
    # Create the enum type idempotently (DO $$ block prevents duplicate errors)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_purpose_enum') THEN
                CREATE TYPE otp_purpose_enum AS ENUM ('REGISTER', 'RESET_PASSWORD', 'DELETE_ACCOUNT');
            END IF;
        END$$;
        """
    )

    op.create_table(
        'user_otps',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column(
            'purpose',
            sa.Enum('REGISTER', 'RESET_PASSWORD', 'DELETE_ACCOUNT', name='otp_purpose_enum'),
            nullable=False,
        ),
        sa.Column('otp_hash', sa.String(length=128), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('resend_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Indexes
    op.create_index('idx_user_otps_user_id', 'user_otps', ['user_id'], unique=False)
    op.create_index('idx_user_otps_expires_at', 'user_otps', ['expires_at'], unique=False)
    op.create_index('idx_user_otps_user_purpose', 'user_otps', ['user_id', 'purpose'], unique=False)


def downgrade() -> None:
    """Drop user_otps table and otp_purpose_enum type."""
    op.drop_index('idx_user_otps_user_purpose', table_name='user_otps')
    op.drop_index('idx_user_otps_expires_at', table_name='user_otps')
    op.drop_index('idx_user_otps_user_id', table_name='user_otps')
    op.drop_table('user_otps')

    # Drop the enum type after the table is gone
    otp_purpose_enum = sa.Enum(name='otp_purpose_enum')
    otp_purpose_enum.drop(op.get_bind(), checkfirst=True)

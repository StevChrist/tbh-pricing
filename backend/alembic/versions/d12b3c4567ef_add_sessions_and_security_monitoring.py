"""add_sessions_and_security_monitoring

Revision ID: d12b3c4567ef
Revises: c9e3f1a847d2
Create Date: 2026-07-06 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd12b3c4567ef'
down_revision: Union[str, Sequence[str], None] = 'c9e3f1a847d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create user_sessions table if not exists (using safe migrations)
    op.create_table(
        'user_sessions',
        sa.Column('id', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ip_address', sa.String(length=64), nullable=False),
        sa.Column('browser', sa.String(length=128), nullable=False),
        sa.Column('os', sa.String(length=128), nullable=False),
        sa.Column('device', sa.String(length=128), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'], unique=False)

    # 2. Create security_events table
    op.create_table(
        'security_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('severity', sa.String(length=32), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('description', sa.String(length=512), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_security_events_user_id', 'security_events', ['user_id'], unique=False)
    op.create_index('ix_security_events_timestamp', 'security_events', ['timestamp'], unique=False)

    # 3. Alter user_login_history.user_id to be nullable
    op.alter_column('user_login_history', 'user_id',
               existing_type=sa.Integer(),
               nullable=True)


def downgrade() -> None:
    # 1. Revert user_login_history.user_id to non-nullable
    op.alter_column('user_login_history', 'user_id',
               existing_type=sa.Integer(),
               nullable=False)

    # 2. Drop security_events
    op.drop_index('ix_security_events_timestamp', table_name='security_events')
    op.drop_index('ix_security_events_user_id', table_name='security_events')
    op.drop_table('security_events')

    # 3. Drop user_sessions
    op.drop_index('ix_user_sessions_user_id', table_name='user_sessions')
    op.drop_table('user_sessions')

"""add_rate_limit_columns_to_users

Revision ID: 534eede37346
Revises: 3cd5e26c7297
Create Date: 2026-07-27 22:15:20.047628

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '534eede37346'
down_revision: Union[str, Sequence[str], None] = '3cd5e26c7297'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('daily_token_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('last_ask_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'last_ask_date')
    op.drop_column('users', 'daily_token_count')

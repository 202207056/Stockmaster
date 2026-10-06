"""add order price_type, commission, and tax

Revision ID: c4e8a1b27d90
Revises: c20260930_cost_policy
Create Date: 2026-10-03 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "c4e8a1b27d90"
down_revision: Union[str, None] = "c20260930_cost_policy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_type VARCHAR(10) NOT NULL DEFAULT '시장가'")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission NUMERIC(20, 2) NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax NUMERIC(20, 2) NOT NULL DEFAULT 0")


def downgrade() -> None:
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS tax")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS price_type")

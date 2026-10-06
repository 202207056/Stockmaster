"""Persistent one-shot scheduled and conditional mock orders."""
from alembic import op
import sqlalchemy as sa

revision = 'd20261006_automations'
down_revision = 'c4e8a1b27d90'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('order_automations',
        sa.Column('automation_id', sa.Integer(), primary_key=True),
        sa.Column('account_id', sa.Integer(), sa.ForeignKey('account.account_id'), nullable=False),
        sa.Column('symbol_code', sa.String(20), sa.ForeignKey('item_master.symbol_code'), nullable=False),
        sa.Column('order_type', sa.String(10), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(16), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True)),
        sa.Column('trigger_operator', sa.String(3)),
        sa.Column('trigger_price', sa.Numeric(20, 2)),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('client_request_id', sa.String(36), nullable=False),
        sa.Column('status', sa.String(16), nullable=False),
        sa.Column('reason', sa.String(300)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_checked_at', sa.DateTime(timezone=True)),
        sa.Column('last_price', sa.Numeric(20, 2)),
        sa.Column('executed_at', sa.DateTime(timezone=True)),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.order_id'), unique=True),
        sa.UniqueConstraint('account_id', 'client_request_id', name='uq_automation_request'))
    op.create_index('ix_order_automations_account_id', 'order_automations', ['account_id'])
    op.create_index('ix_order_automations_status', 'order_automations', ['status'])


def downgrade():
    op.drop_table('order_automations')

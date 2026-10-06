"""Persist charged costs and explicit equity classification; preserve legacy orders."""
from alembic import op
import sqlalchemy as sa

revision = 'c20260930_cost_policy'
down_revision = '2622474e79f5'
branch_labels = None
depends_on = None

# These are the KOSPI equity codes in the repository's existing seed, not a name heuristic.
SEED_CODES = ('005930','000660','066570','009150','032830','005380','000270','012330',
              '035420','035720','017670','030200','032640','051910','096770','010950',
              '011170','105560','055550','086790','316140','003550','207940','068270',
              '326030','005490','010130','139480','004020','006400')


def upgrade():
    op.add_column('item_master', sa.Column('tax_market', sa.String(12), nullable=True))
    op.add_column('item_master', sa.Column('instrument_type', sa.String(20), nullable=True))
    for name in ('commission', 'transaction_tax', 'rural_tax', 'cash_delta'):
        op.add_column('orders', sa.Column(name, sa.Numeric(20, 2), nullable=True))
    op.add_column('orders', sa.Column('realized_pnl', sa.Numeric(20, 6), nullable=True))
    op.add_column('orders', sa.Column('tax_market', sa.String(12), nullable=True))
    op.add_column('orders', sa.Column('cost_policy_version', sa.String(40), nullable=True))
    op.add_column('portfolio', sa.Column('acquisition_cost', sa.Numeric(20, 6), nullable=True))
    # Restore fractional average-price storage removed by the preceding migration.
    op.alter_column('portfolio', 'avg_price', existing_type=sa.Integer(), type_=sa.Numeric(20, 6), existing_nullable=False)
    op.execute('UPDATE portfolio SET acquisition_cost = avg_price * hold_quantity')
    table = sa.table('item_master', sa.column('symbol_code', sa.String(20)), sa.column('market_type', sa.String(20)), sa.column('tax_market', sa.String(12)), sa.column('instrument_type', sa.String(20)))
    op.execute(table.update().where(table.c.symbol_code.in_(SEED_CODES), table.c.market_type == '국내주식').values(tax_market='KOSPI', instrument_type='EQUITY'))


def downgrade():
    op.drop_column('portfolio', 'acquisition_cost')
    for name in ('commission', 'transaction_tax', 'rural_tax', 'cash_delta', 'realized_pnl', 'tax_market', 'cost_policy_version'):
        op.drop_column('orders', name)
    op.drop_column('item_master', 'instrument_type')
    op.drop_column('item_master', 'tax_market')
    # Keep precision: downgrading must not truncate existing average prices.

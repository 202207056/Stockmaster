from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from app.database import Base


class OrderAutomation(Base):
    __tablename__ = 'order_automations'
    __table_args__ = (UniqueConstraint('account_id', 'client_request_id', name='uq_automation_request'),)

    automation_id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey('account.account_id'), nullable=False, index=True)
    symbol_code = Column(String(20), ForeignKey('item_master.symbol_code'), nullable=False)
    order_type = Column(String(10), nullable=False)
    quantity = Column(Integer, nullable=False)
    kind = Column(String(16), nullable=False)
    scheduled_at = Column(DateTime(timezone=True))
    trigger_operator = Column(String(3))
    trigger_price = Column(Numeric(20, 2))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    client_request_id = Column(String(36), nullable=False)
    status = Column(String(16), nullable=False, default='active', index=True)
    reason = Column(String(300))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_checked_at = Column(DateTime(timezone=True))
    last_price = Column(Numeric(20, 2))
    executed_at = Column(DateTime(timezone=True))
    order_id = Column(Integer, ForeignKey('orders.order_id'), unique=True)

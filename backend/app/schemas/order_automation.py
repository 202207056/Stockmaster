from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AutomationRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    account_id: int = Field(gt=0)
    symbol_code: str = Field(pattern=r'^\d{6}$')
    order_type: Literal['매수', '매도']
    quantity: int = Field(gt=0, le=1000000, strict=True)
    kind: Literal['scheduled', 'condition']
    scheduled_at: datetime | None = None
    trigger_operator: Literal['gte', 'lte'] | None = None
    trigger_price: Decimal | None = Field(default=None, gt=0, le=1000000000)
    expires_at: datetime
    client_request_id: UUID

    @model_validator(mode='after')
    def validate_shape(self):
        for value in (self.scheduled_at, self.expires_at):
            if value is not None and (value.tzinfo is None or value.utcoffset() is None):
                raise ValueError('시간에는 한국시간 +09:00 또는 UTC offset이 필요합니다.')
        if self.kind == 'scheduled':
            if not self.scheduled_at or self.trigger_operator is not None or self.trigger_price is not None:
                raise ValueError('예약 주문은 실행 시각만 지정합니다.')
            if self.scheduled_at >= self.expires_at:
                raise ValueError('만료는 예약 실행 시각보다 늦어야 합니다.')
        elif self.scheduled_at is not None or self.trigger_operator is None or self.trigger_price is None:
            raise ValueError('조건 주문은 가격과 이상/이하 조건을 지정합니다.')
        return self

    def validate_new(self, now=None):
        now = now or datetime.now(timezone.utc)
        if not now < self.expires_at <= now + timedelta(days=30):
            raise ValueError('만료는 현재 이후 30일 이내여야 합니다.')
        if self.scheduled_at and self.scheduled_at <= now:
            raise ValueError('예약 실행 시각은 현재보다 늦어야 합니다.')


class AutomationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    automation_id: int
    account_id: int
    symbol_code: str
    order_type: str
    quantity: int
    kind: str
    scheduled_at: datetime | None
    trigger_operator: str | None
    trigger_price: Decimal | None
    expires_at: datetime
    client_request_id: str
    status: str
    reason: str | None
    created_at: datetime
    last_checked_at: datetime | None
    last_price: Decimal | None
    executed_at: datetime | None
    order_id: int | None

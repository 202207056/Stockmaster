from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class OrderRequest(BaseModel):
    """
    주문 요청 스키마 (프론트 → 백엔드).

    요청 예시:
        {
            "account_id": 1,
            "symbol_code": "005930",
            "order_type": "매수",
            "price": 75000,
            "quantity": 10
        }
    """
    account_id: int = Field(..., description="주문을 넣을 계좌 ID")
    symbol_code: str = Field(..., description="종목 코드 (예: 005930)", max_length=20)
    order_type: str = Field(..., description="주문 타입 (매수, 매도)")
    price_type: Literal["지정가", "시장가", "중간가", "최유리지정가", "최우선지정가"] = "시장가"
    # 시장가에서는 화면 표시용이고, 지정가에서는 이 가격으로 대기 주문을 만든다.
    price: Decimal = Field(..., gt=0, le=1000000000, allow_inf_nan=False, description="지정가만 고객 입력값 사용. 나머지는 서버 시세/호가로 결정")
    quantity: int = Field(..., gt=0, le=1000000, description="주문 수량 (1주 이상)")


class OrderResponse(BaseModel):
    """
    주문 응답 스키마 (백엔드 → 프론트).

    응답 예시:
        {
            "order_id": 1,
            "account_id": 1,
            "symbol_code": "005930",
            "order_type": "매수",
            "price": 75000,
            "quantity": 10,
            "status": "체결",
            "message": "005930 10주 매수가 완료되었습니다.",
            "created_at": "2024-01-15T10:30:00"
        }
    """
    order_id: int = Field(..., description="생성된 주문의 고유 ID")
    account_id: int = Field(..., description="주문한 계좌 ID")
    symbol_code: str = Field(..., description="종목 코드")
    order_type: str = Field(..., description="주문 타입")
    price_type: str = Field("시장가", description="시장가 또는 지정가")
    price: Decimal = Field(..., description="주문 단가")
    quantity: int = Field(..., description="주문 수량")
    commission: Decimal = Field(0, description="수수료. 매수·매도 모두")
    tax: Decimal = Field(0, description="거래세. 매도에만 있고 매수는 0")
    status: str = Field(..., description="현재 주문 상태 (대기, 체결, 취소)")
    message: str | None = Field(None, description="프론트 화면에 띄울 알림 메시지")
    created_at: datetime = Field(..., description="주문 접수 시간")

    class Config:
        from_attributes = True

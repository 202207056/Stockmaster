from datetime import datetime
from decimal import Decimal

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
    # price 는 프론트가 보내는 화면 표시용 값이다. 체결가는 서버가 현재가로 정한다.
    price: Decimal = Field(..., gt=0, description="화면 표시용 희망가 (체결가는 서버가 현재가로 결정)")
    quantity: int = Field(..., gt=0, description="주문 수량 (1주 이상)")


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
    price: Decimal = Field(..., description="주문 단가")
    quantity: int = Field(..., description="주문 수량")
    status: str = Field(..., description="현재 주문 상태 (대기, 체결, 거부)")
    message: str | None = Field(None, description="프론트 화면에 띄울 알림 메시지")
    created_at: datetime = Field(..., description="주문 접수 시간")

    class Config:
        from_attributes = True

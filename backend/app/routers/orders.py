"""
routers/orders.py - 주문(매수/매도) API 엔드포인트

제공하는 API:
    POST /api/trading/orders            → 매수/매도 주문
    GET  /api/trading/orders?account_id → 주문 내역 조회
    PUT  /api/trading/orders/{id}/cancel → 주문 취소 (미체결 상태인 경우)

주문이 들어오면 order_service.py에서 처리합니다.
모의투자이므로 주문 즉시 체결됩니다.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.order import Order
from app.models.user import User
from app.schemas.order import OrderRequest, OrderResponse
from app.services.kis_service import get_current_price
from app.services.order_service import create_order
from app.utils.deps import get_current_user

# prefix는 main.py에서 /api/trading/orders 로 지정
router = APIRouter(tags=["거래"])


@router.post("", response_model=OrderResponse, summary="매수/매도 주문")
async def place_order(
    req: OrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    매수 또는 매도 주문을 실행합니다.

    요청 JSON 형식은 그대로입니다.
    다만 price 는 참고용이고, 체결가는 KIS 현재가로 결정합니다.

    요청 예시 (삼성전자 10주 매수):
        POST /api/trading/orders
        {
            "account_id": 1,
            "symbol_code": "005930",
            "order_type": "매수",
            "price": 75000,
            "quantity": 10
        }
    """
    try:
        quote = await get_current_price(req.symbol_code)
    except Exception:
        raise HTTPException(status_code=400, detail="현재 시세를 확인할 수 없어 주문하지 않았습니다.")

    fill_price = Decimal(quote.get("current_price") or 0)
    if fill_price <= 0:
        raise HTTPException(status_code=400, detail="현재 시세를 확인할 수 없어 주문하지 않았습니다.")

    order = create_order(db, req, current_user.user_id, fill_price)

    # 체결 완료 메시지 생성 (프론트 알림용)
    # 예: "삼성전자(005930) 10주 매수가 완료되었습니다."
    message = f"{order.symbol_code} {order.quantity}주 {order.order_type}가 완료되었습니다."

    # OrderResponse 형식으로 응답 구성
    # order 객체의 필드 + message 를 합쳐서 반환
    return OrderResponse(
        order_id=order.order_id,
        account_id=order.account_id,
        symbol_code=order.symbol_code,
        order_type=order.order_type,
        price=order.price,
        quantity=order.quantity,
        status=order.status,
        message=message,
        created_at=order.created_at,
    )


@router.get("", response_model=list[OrderResponse], summary="주문 내역 조회")
def get_orders(
    # URL에 ?account_id=1 형태로 전달 (필수값, ... 은 필수를 의미)
    account_id: int = Query(..., description="계좌 번호"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    특정 계좌의 주문 내역을 최신순으로 반환합니다.

    본인 계좌의 주문 내역만 조회 가능합니다.

    사용 예시:
        GET /api/trading/orders?account_id=1
    """
    # 먼저 내 계좌인지 확인
    account = db.query(Account).filter(
        Account.account_id == account_id,
        Account.user_id == current_user.user_id,
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="계좌를 찾을 수 없습니다.")

    # 주문 내역 조회 (최신순 정렬)
    orders = (
        db.query(Order)
        .filter(Order.account_id == account_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    # 목록 조회 시에는 message 없이 반환 (message=None 기본값)
    return [
        OrderResponse(
            order_id=o.order_id,
            account_id=o.account_id,
            symbol_code=o.symbol_code,
            order_type=o.order_type,
            price=o.price,
            quantity=o.quantity,
            status=o.status,
            created_at=o.created_at,
        )
        for o in orders
    ]


@router.put("/{order_id}/cancel", summary="주문 취소")
def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    미체결 상태의 주문을 취소합니다.

    모의투자에서는 즉시 체결되므로 실제로는 잘 쓰이지 않지만,
    팀장 요청에 따라 API 경로는 구현합니다.

    사용 예시:
        PUT /api/trading/orders/5/cancel
    """
    # 내 계좌의 주문인지 확인
    order = (
        db.query(Order)
        .join(Account)
        .filter(
            Order.order_id == order_id,
            Account.user_id == current_user.user_id,
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")

    # 이미 체결됐으면 취소 불가
    if order.status == "체결":
        raise HTTPException(status_code=400, detail="이미 체결된 주문은 취소할 수 없습니다.")

    order.status = "취소"
    db.commit()
    return {"message": f"주문 #{order_id}이 취소되었습니다."}

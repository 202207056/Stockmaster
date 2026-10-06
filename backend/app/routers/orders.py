"""
routers/orders.py - 주문(매수/매도) API 엔드포인트

제공하는 API:
    POST /api/trading/orders            → 매수/매도 주문
    GET  /api/trading/orders?account_id → 주문 내역 조회
    PUT  /api/trading/orders/{id}/cancel → 주문 취소 (미체결 상태인 경우)

주문이 들어오면 order_service.py에서 처리합니다.
시장가는 현재가로 바로 체결하고, 지정가는 대기만 한다.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.order import Order
from app.models.security import ItemMaster
from app.models.user import User
from app.schemas.order import OrderRequest, OrderResponse
from app.services.kis_service import get_current_price, get_listed_stock
from app.services.order_service import create_order, check_pending_order
from app.services.order_book import get_order_book, BOOK_TYPES, ORDER_TYPES
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

    price_type 을 생략하면 시장가다. 시장가는 KIS 현재가로 바로 체결한다.
    지정가는 요청의 price 로 대기 주문을 만들고 잔고와 보유 수량은 바꾸지 않는다.
    종목 표에 없는 코드는 한국 이름을 확인한 뒤 한 줄을 넣고 주문한다.

    요청 예시 (삼성전자 10주 시장가 매수):
        POST /api/trading/orders
        {
            "account_id": 1,
            "symbol_code": "005930",
            "order_type": "매수",
            "price_type": "시장가",
            "price": 75000,
            "quantity": 10
        }
    """
    price_type = (req.price_type or "시장가").strip()
    if price_type not in ORDER_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 주문유형입니다.")
    if not db.query(Account).filter(Account.account_id == req.account_id, Account.user_id == current_user.user_id).first():
        raise HTTPException(404, "계좌를 찾을 수 없습니다.")
    book = await _book(req.symbol_code) if price_type in BOOK_TYPES else None

    known = db.query(ItemMaster).filter(ItemMaster.symbol_code == req.symbol_code).first()
    stock_name = known.name if known else None
    sector_code = None
    fill_price = req.price

    if price_type == "시장가":
        try:
            quote = await get_current_price(req.symbol_code)
        except Exception:
            raise HTTPException(status_code=400, detail="현재 시세를 확인할 수 없어 주문하지 않았습니다.")
        fill_price = Decimal(quote.get("current_price") or 0)
        if fill_price <= 0:
            raise HTTPException(status_code=400, detail="현재 시세를 확인할 수 없어 주문하지 않았습니다.")
        if not stock_name:
            stock_name = str(quote.get("name") or "").strip() or None
    elif not stock_name:
        listed = await get_listed_stock(req.symbol_code)
        if not listed:
            raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다.")
        stock_name = listed["name"]
        sector_code = listed.get("sector_code")

    if not known and not stock_name:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다.")

    order = create_order(
        db,
        req,
        current_user.user_id,
        fill_price,
        stock_name=stock_name,
        sector_code=sector_code,
        book=book,
    )

    if order.status == "체결":
        message = (
            f"{order.symbol_code} {order.quantity}주 {order.order_type}가 완료되었습니다. "
            f"수수료 {int(order.commission)}원"
        )
        if order.order_type == "매도":
            message += f", 거래세 {int(order.tax)}원"
        message += "."
    else:
        message = f"{order.symbol_code} {order.quantity}주 {order.price_type} 주문을 접수했습니다. 대기 중이며 잔고는 아직 변하지 않습니다."

    return _to_response(order, message)


async def _book(code):
    try:
        return await get_order_book(code)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "호가 조회에 실패했습니다. 주문을 실행하지 않았습니다.")


@router.get("/book/{symbol_code}", summary="주문용 최우선 호가 조회")
async def order_book(symbol_code: str, current_user: User = Depends(get_current_user)):
    return await _book(symbol_code)


@router.post("/{order_id}/check", response_model=OrderResponse, summary="대기 주문의 모의 체결 확인")
async def check_order(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).join(Account).filter(Order.order_id == order_id, Account.user_id == current_user.user_id).first()
    if not order:
        raise HTTPException(404, "주문을 찾을 수 없습니다.")
    if order.status != "대기":
        return _to_response(order)
    book = await _book(order.symbol_code)
    result = check_pending_order(db, order_id, order.account_id, current_user.user_id, book)
    return _to_response(result, "잔고 또는 보유수량 부족으로 거부되었습니다." if result.status == "거부" else f"모의 체결 확인: {result.status}")


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

    return [_to_response(o) for o in orders]


def _to_response(order: Order, message: str | None = None) -> OrderResponse:
    """주문 행을 응답 형식으로 바꾼다."""
    return OrderResponse(
        order_id=order.order_id,
        account_id=order.account_id,
        symbol_code=order.symbol_code,
        order_type=order.order_type,
        price_type=order.price_type or "시장가",
        price=order.price,
        quantity=order.quantity,
        commission=order.commission or 0,
        tax=order.tax or 0,
        status=order.status,
        message=message,
        created_at=order.created_at,
    )


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
    owned = db.query(Order).join(Account).filter(Order.order_id == order_id, Account.user_id == current_user.user_id).first()
    if not owned:
        raise HTTPException(404, "주문을 찾을 수 없습니다.")
    db.query(Account).filter(Account.account_id == owned.account_id).with_for_update().first()
    order = (
        db.query(Order)
        .join(Account)
        .filter(
            Order.order_id == order_id,
            Account.user_id == current_user.user_id,
        )
        .with_for_update().populate_existing().first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")

    # 이미 체결됐으면 취소 불가
    if order.status != "대기":
        raise HTTPException(status_code=400, detail="대기 주문만 취소할 수 있습니다.")

    order.status = "취소"
    db.commit()
    return {"message": f"주문 #{order_id}이 취소되었습니다."}

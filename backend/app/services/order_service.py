"""
services/order_service.py - 주문(매수/매도) 비즈니스 로직

모의투자의 핵심 기능인 매수/매도 처리를 담당합니다.

실제 증권사 vs 모의투자 차이:
    실제: 주문 넣으면 → 시장에서 매칭 → 체결 (시간이 걸림)
    모의: 주문 넣으면 → 즉시 체결 (시장가 방식)

매수 처리 흐름:
    1. 계좌 확인 (내 계좌인지)
    2. 종목 확인 (존재하는 종목인지)
    3. 잔고 확인 (돈이 충분한지)
    4. 잔고 차감 (현금 감소)
    5. 포트폴리오 업데이트 (보유 수량, 평균단가 재계산)
    6. 주문 기록 저장

매도 처리 흐름:
    1. 계좌 확인
    2. 보유 수량 확인 (팔 주식이 있는지)
    3. 포트폴리오 수량 감소
    4. 잔고 증가 (현금 증가)
    5. 주문 기록 저장
"""

from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.order import Order
from app.models.portfolio import Portfolio
from app.models.security import ItemMaster
from app.schemas.order import OrderRequest
from app.services.order_book import ORDER_TYPES, BOOK_TYPES, resolve_price, executable

# 연습용 요율. 수수료는 매수·매도, 거래세는 매도만.
FEE_RATE = Decimal("0.00015")
SELL_TAX_RATE = Decimal("0.0018")


def _won(amount: Decimal) -> Decimal:
    """원 단위 반올림."""
    return amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def trade_cost(order_type: str, price: Decimal, quantity: int) -> tuple[Decimal, Decimal, Decimal]:
    """거래대금, 수수료, 거래세를 계산한다. 매수 거래세는 0이다."""
    gross = price * quantity
    commission = _won(gross * FEE_RATE)
    tax = _won(gross * SELL_TAX_RATE) if order_type == "매도" else Decimal("0")
    return gross, commission, tax


def create_order(
    db: Session,
    req: OrderRequest,
    user_id: int,
    fill_price: Decimal,
    stock_name: str | None = None,
    sector_code: str | None = None,
    commit: bool = True,
    book: dict | None = None,
) -> Order:
    """
    주문 생성 및 즉시 체결 처리.

    프론트가 보낸 price 는 쓰지 않는다.
    체결가(fill_price)는 라우터에서 KIS 현재가를 조회해 넘겨준다.
    계좌·보유종목은 with_for_update() 로 잠가서, 탭을 두 개 열고
    동시에 주문해도 잔고가 마이너스가 되지 않게 한다.

    Args:
        db: DB 세션
        req: 주문 요청 (account_id, symbol_code, order_type, quantity)
        user_id: 현재 로그인한 유저의 ID
        fill_price: 서버가 조회한 현재가 (원)
    """
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="주문 수량은 1주 이상이어야 합니다.")

    # 계좌를 잠근 뒤 확인한다. (동시 주문 방지)
    account = (
        db.query(Account)
        .filter(
            Account.account_id == req.account_id,
            Account.user_id == user_id,
        )
        .with_for_update()
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="계좌를 찾을 수 없습니다.")

    price_type = (req.price_type or "시장가").strip()
    if price_type not in ORDER_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 주문유형입니다.")
    if req.order_type not in ("매수", "매도"):
        raise HTTPException(status_code=400, detail="order_type은 매수 또는 매도여야 합니다.")

    _ensure_security(db, req.symbol_code, stock_name, sector_code)

    if price_type == "시장가" and fill_price <= 0:
        raise HTTPException(status_code=400, detail="현재 시세를 확인할 수 없어 주문하지 않았습니다.")

    order_price = fill_price if price_type == "시장가" else req.price
    fill_now = price_type == "시장가"
    if price_type in BOOK_TYPES:
        try:
            order_price = resolve_price(price_type, req.order_type, book)
            fill_now = executable(req.order_type, order_price, req.quantity, book)
        except (ValueError, TypeError, KeyError):
            raise HTTPException(400, "유효한 호가가 없어 주문하지 않았습니다.")
        if fill_now:
            order_price = Decimal(str(book["ask"] if req.order_type == "매수" else book["bid"]))
    gross, commission, tax = trade_cost(req.order_type, order_price, req.quantity)
    cash_out = gross + commission
    cash_in = gross - commission - tax

    if fill_now:
        if req.order_type == "매수":
            _process_buy(db, account, req, cash_out, order_price)
        else:
            _process_sell(db, account, req, cash_in)
        status = "체결"
    else:
        if req.order_type == "매수" and account.withdrawable_cash < cash_out:
            raise HTTPException(status_code=400, detail="매수 가능 현금이 부족합니다.")
        if req.order_type == "매도":
            holding = (
                db.query(Portfolio)
                .filter(
                    Portfolio.account_id == req.account_id,
                    Portfolio.symbol_code == req.symbol_code,
                )
                .with_for_update()
                .first()
            )
            if not holding or holding.hold_quantity < req.quantity:
                raise HTTPException(status_code=400, detail="보유 수량이 부족합니다.")
        status = "대기"

    order = Order(
        account_id=req.account_id,
        symbol_code=req.symbol_code,
        order_type=req.order_type,
        price_type=price_type,
        price=order_price,
        quantity=req.quantity,
        commission=commission,
        tax=tax,
        status=status,
    )
    db.add(order)
    if commit:
        db.commit()
        db.refresh(order)
    else:
        db.flush()
    return order


def check_pending_order(db: Session, order_id: int, account_id: int, user_id: int, book: dict) -> Order:
    """Explicit simulation step, never a mutation on GET. Lock account before order."""
    account = db.query(Account).filter(Account.account_id == account_id, Account.user_id == user_id).with_for_update().first()
    if not account:
        raise HTTPException(404, "계좌를 찾을 수 없습니다.")
    order = db.query(Order).filter(Order.order_id == order_id, Order.account_id == account_id).with_for_update().populate_existing().first()
    if not order:
        raise HTTPException(404, "주문을 찾을 수 없습니다.")
    if order.status != "대기":
        return order
    limit = resolve_price("중간가", order.order_type, book) if order.price_type == "중간가" else order.price
    order.price = limit
    gross, order.commission, order.tax = trade_cost(order.order_type, limit, order.quantity)
    if executable(order.order_type, limit, order.quantity, book):
        price = Decimal(str(book["ask"] if order.order_type == "매수" else book["bid"]))
        gross, commission, tax = trade_cost(order.order_type, price, order.quantity)
        req = OrderRequest(account_id=account_id, symbol_code=order.symbol_code, order_type=order.order_type,
                           price_type=order.price_type, price=price, quantity=order.quantity)
        try:
            if order.order_type == "매수":
                _process_buy(db, account, req, gross + commission, price)
            else:
                _process_sell(db, account, req, gross - commission - tax)
        except HTTPException as exc:
            if exc.status_code != 400:
                raise
            order.status = "거부"
        else:
            order.price, order.commission, order.tax, order.status = price, commission, tax, "체결"
    db.commit()
    db.refresh(order)
    return order


def _ensure_security(db: Session, symbol_code: str, name: str | None, sector_code: str | None) -> ItemMaster:
    """주문 전에 종목 행이 없으면 코드와 이름만 넣는다. 이미 있으면 그대로 둔다."""
    security = db.query(ItemMaster).filter(ItemMaster.symbol_code == symbol_code).first()
    if security:
        return security
    stock_name = (name or "").strip()
    if not stock_name:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다.")
    security = ItemMaster(
        symbol_code=symbol_code,
        name=stock_name[:100],
        market_type="국내주식",
        sector_code=((sector_code or "").strip()[:20] or None),
    )
    db.add(security)
    db.flush()
    return security


def _process_buy(
    db: Session,
    account: Account,
    req: OrderRequest,
    total_amount: Decimal,
    fill_price: Decimal,
):
    """
    매수 처리 내부 함수.

    1. 잔고 부족 확인
    2. 현금 차감
    3. 포트폴리오 업데이트 (평균단가는 서버 체결가 기준)
    """
    if account.withdrawable_cash < total_amount:
        raise HTTPException(status_code=400, detail="매수 가능 현금이 부족합니다.")

    account.withdrawable_cash -= total_amount
    account.balance -= total_amount

    # 보유 행도 잠근다. 같은 종목을 동시에 사면 평균단가가 엇갈릴 수 있다.
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.account_id == req.account_id,
            Portfolio.symbol_code == req.symbol_code,
        )
        .with_for_update()
        .first()
    )

    if portfolio:
        total_qty = portfolio.hold_quantity + req.quantity
        portfolio.avg_price = (
            (portfolio.avg_price * portfolio.hold_quantity + fill_price * req.quantity) / total_qty
        )
        portfolio.hold_quantity = total_qty
    else:
        portfolio = Portfolio(
            account_id=req.account_id,
            symbol_code=req.symbol_code,
            avg_price=fill_price,
            hold_quantity=req.quantity,
        )
        db.add(portfolio)


def _process_sell(
    db: Session,
    account: Account,
    req: OrderRequest,
    total_amount: Decimal,
):
    """
    매도 처리 내부 함수.

    total_amount 는 거래대금에서 수수료와 거래세를 뺀 입금액이다.
    """
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.account_id == req.account_id,
            Portfolio.symbol_code == req.symbol_code,
        )
        .with_for_update()
        .first()
    )

    if not portfolio or portfolio.hold_quantity < req.quantity:
        raise HTTPException(status_code=400, detail="보유 수량이 부족합니다.")

    portfolio.hold_quantity -= req.quantity
    account.withdrawable_cash += total_amount
    account.balance += total_amount

    if portfolio.hold_quantity == 0:
        db.delete(portfolio)

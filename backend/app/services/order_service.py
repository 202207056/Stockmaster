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

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.order import Order
from app.models.portfolio import Portfolio
from app.models.security import ItemMaster
from app.schemas.order import OrderRequest


def create_order(
    db: Session,
    req: OrderRequest,
    user_id: int,
    fill_price: Decimal,
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
    if fill_price <= 0:
        raise HTTPException(status_code=400, detail="현재 시세를 확인할 수 없어 주문하지 않았습니다.")

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

    security = db.query(ItemMaster).filter(ItemMaster.symbol_code == req.symbol_code).first()
    if not security:
        raise HTTPException(status_code=404, detail="종목을 찾을 수 없습니다.")

    # 총 거래 금액 = 서버 현재가 × 수량
    total_amount = fill_price * req.quantity

    if req.order_type == "매수":
        _process_buy(db, account, req, total_amount, fill_price)
    elif req.order_type == "매도":
        _process_sell(db, account, req, total_amount)
    else:
        raise HTTPException(status_code=400, detail="order_type은 매수 또는 매도여야 합니다.")

    order = Order(
        account_id=req.account_id,
        symbol_code=req.symbol_code,
        order_type=req.order_type,
        price=fill_price,
        quantity=req.quantity,
        status="체결",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


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

    체결 금액(total_amount)은 서버 현재가 × 수량이다.
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

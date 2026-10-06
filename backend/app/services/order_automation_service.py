"""Durable one-shot mock orders; no external brokerage order API calls."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import HTTPException
from sqlalchemy import select

from app.database import SessionLocal
from app.models.account import Account
from app.models.order_automation import OrderAutomation
from app.schemas.order import OrderRequest
from app.services import kis_service as kis
from app.services.chart_history import KST, _ChartClient
from app.services.order_service import create_order

INTERVAL_SECONDS = 30
ACTIVE = 'active'
logger = logging.getLogger(__name__)
monitor_state = {'running': False, 'last_cycle_at': None}


def utc(value):
    # SQLite test databases drop offsets; production uses timestamptz.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def in_session(now):
    local = now.astimezone(KST)
    return local.weekday() < 5 and '09:00' <= local.strftime('%H:%M') < '15:20'


def usable_quote(quote, now):
    try:
        price, observed = Decimal(str(quote['price'])), utc(quote['observed_at'])
        return (price.is_finite() and price > 0 and price == price.to_integral_value()
                and observed.astimezone(KST).date() == now.astimezone(KST).date()
                and 0 <= (now - observed).total_seconds() <= 120)
    except (TypeError, KeyError, ValueError, ArithmeticError, AttributeError):
        return False


async def fetch_execution_quote(symbol, now):
    """One uncached minute-page read; require a dated actual trade, not a last close."""
    real = bool(kis.settings.KIS_REAL_APP_KEY and kis.settings.KIS_REAL_APP_SECRET)
    if not real and not (kis.settings.KIS_APP_KEY and kis.settings.KIS_APP_SECRET):
        raise ValueError('시세 연결 미설정')
    local = now.astimezone(KST)
    token = await (kis.get_real_kis_token() if real else kis.get_kis_token())
    params = {'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': symbol,
              'FID_INPUT_HOUR_1': local.strftime('%H%M%S'), 'FID_PW_DATA_INCU_YN': 'N'}
    if real:
        params.update(FID_INPUT_DATE_1=local.strftime('%Y%m%d'), FID_FAKE_TICK_INCU_YN='')
        endpoint, tr_id = 'inquire-time-dailychartprice', 'FHKST03010230'
    else:
        params['FID_ETC_CLS_CODE'] = ''
        endpoint, tr_id = 'inquire-time-itemchartprice', 'FHKST03010200'
    async with httpx.AsyncClient(timeout=15) as client:
        items = await _ChartClient(client, real, token).get(endpoint, tr_id, params)
    quotes = []
    for item in items:
        try:
            observed = datetime.strptime(item['stck_bsop_date'] + item['stck_cntg_hour'], '%Y%m%d%H%M%S').replace(tzinfo=KST)
            quote = {'price': Decimal(item['stck_prpr']), 'observed_at': observed}
            if int(item.get('cntg_vol') or 0) > 0 and usable_quote(quote, now):
                quotes.append(quote)
        except (KeyError, TypeError, ValueError, ArithmeticError):
            continue
    return max(quotes, key=lambda q: q['observed_at']) if quotes else None


def process_one(db, automation_id, quote, now, unavailable_reason=None):
    """Caller commits state, generated order and cash together. Lock races with cancel."""
    job = db.execute(select(OrderAutomation).where(
        OrderAutomation.automation_id == automation_id).with_for_update()).scalar_one_or_none()
    if job is None or job.status != ACTIVE:
        return
    job.last_checked_at = now
    if now >= utc(job.expires_at):
        job.status, job.reason = 'expired', '유효기간이 지나 실행하지 않았습니다.'
        return
    if not in_session(now):
        job.reason = '감시 시간 대기 · 평일 09:00~15:20 한국시간'
        return
    if job.kind == 'scheduled' and now < utc(job.scheduled_at):
        job.reason = '예약 시각 대기'
        return
    if not usable_quote(quote, now):
        job.reason = unavailable_reason or '당일 최근 2분 이내 체결 시세를 기다립니다. 휴장·거래정지·시세 지연일 수 있습니다.'
        return
    earliest = utc(job.scheduled_at if job.kind == 'scheduled' else job.created_at)
    if utc(quote['observed_at']) < earliest:
        job.reason = '등록/예약 시각 이후의 새 시세를 기다립니다.'
        return
    price = Decimal(str(quote['price']))
    job.last_price = price
    if job.kind == 'condition':
        triggered = price >= job.trigger_price if job.trigger_operator == 'gte' else price <= job.trigger_price
        if not triggered:
            job.reason = '가격 조건 감시 중'
            return
    # Do not load an Account instance before create_order acquires its row lock:
    # SQLAlchemy's identity map could otherwise retain a pre-lock cash snapshot.
    user_id = db.execute(select(Account.user_id).where(Account.account_id == job.account_id)).scalar_one()
    request = OrderRequest(account_id=job.account_id, symbol_code=job.symbol_code,
                           order_type=job.order_type, price_type='시장가', price=price, quantity=job.quantity)
    try:
        # Roll back any partial fill before recording a business rejection.
        with db.begin_nested():
            order = create_order(db, request, user_id, price, commit=False)
        job.order_id, job.executed_at = order.order_id, now
        job.status, job.reason = 'executed', '시장가 모의 체결 완료 · 실제 비용은 주문내역에서 확인하세요.'
    except HTTPException as exc:
        if exc.status_code not in (400, 404):
            raise
        job.status, job.reason = 'rejected', str(exc.detail)[:300]


async def run_cycle(session_factory=SessionLocal, quote_loader=fetch_execution_quote, now=None):
    with session_factory() as db:
        pending = list(db.execute(select(OrderAutomation.automation_id, OrderAutomation.symbol_code,
                                        OrderAutomation.scheduled_at, OrderAutomation.expires_at)
                                 .where(OrderAutomation.status == ACTIVE)
                                 .order_by(OrderAutomation.automation_id)).all())
    quotes = {}
    for job_id, symbol, scheduled, expires in pending:
        current = now or datetime.now(timezone.utc)
        reason = None
        if in_session(current) and current < utc(expires) and (scheduled is None or current >= utc(scheduled)):
            if symbol not in quotes:
                try:
                    quotes[symbol] = await quote_loader(symbol, current)
                except Exception:
                    # Do not leak external response bodies or credentials into user records.
                    quotes[symbol] = None
            if quotes[symbol] is None:
                reason = '최근 시세를 확인하지 못해 실행을 보류했습니다. 다음 주기에 재확인합니다.'
        with session_factory() as db:
            try:
                process_one(db, job_id, quotes.get(symbol), now or datetime.now(timezone.utc), reason)
                db.commit()
            except Exception:
                db.rollback()
                logger.warning('Automation %s processing failed; transaction rolled back', job_id)


async def monitor():
    monitor_state['running'] = True
    try:
        while True:
            try:
                await run_cycle()
                monitor_state['last_cycle_at'] = datetime.now(timezone.utc)
            except Exception:
                logger.warning('Automation monitor cycle failed; will retry')
            await asyncio.sleep(INTERVAL_SECONDS)
    finally:
        monitor_state['running'] = False

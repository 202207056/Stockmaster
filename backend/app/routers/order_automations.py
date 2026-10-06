from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.account import Account
from app.models.order_automation import OrderAutomation
from app.models.security import ItemMaster
from app.models.user import User
from app.schemas.order_automation import AutomationRequest, AutomationResponse
from app.services.kis_service import get_listed_stock
from app.services.order_automation_service import INTERVAL_SECONDS, monitor_state, utc
from app.utils.deps import get_current_user

router = APIRouter()


def capabilities_data():
    checked = monitor_state['last_cycle_at']
    source_ready = bool((settings.KIS_APP_KEY and settings.KIS_APP_SECRET) or
                        (settings.KIS_REAL_APP_KEY and settings.KIS_REAL_APP_SECRET))
    healthy = bool(source_ready and settings.ENABLE_ORDER_AUTOMATIONS and monitor_state['running'] and checked
                   and (datetime.now(timezone.utc) - checked).total_seconds() < 120)
    return {'enabled': healthy, 'last_cycle_at': checked, 'interval_seconds': INTERVAL_SECONDS,
            'timezone': 'Asia/Seoul', 'session': '평일 09:00~15:20', 'max_days': 30,
            'execution_price_type': '시장가', 'reason': None if healthy else '예약·조건 주문 감시가 준비되지 않았습니다. 서버 실행 상태와 시세 연결을 확인해 주세요.'}


@router.get('/capabilities')
def capabilities(current_user: User = Depends(get_current_user)):
    return capabilities_data()


def own_account(db, account_id, user_id, lock=False):
    statement = select(Account).where(Account.account_id == account_id, Account.user_id == user_id)
    if lock:
        statement = statement.with_for_update()
    account = db.execute(statement).scalar_one_or_none()
    if account is None:
        raise HTTPException(404, '계좌를 찾을 수 없습니다.')
    return account


def require_schema(db):
    if not inspect(db.bind).has_table('order_automations'):
        raise HTTPException(503, '예약·조건 주문 데이터 준비가 필요합니다. 서버 업데이트를 확인해 주세요.')


@router.get('', response_model=list[AutomationResponse])
def list_automations(account_id: int = Query(..., gt=0),
                     current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    own_account(db, account_id, current_user.user_id)
    require_schema(db)
    return db.execute(select(OrderAutomation).where(OrderAutomation.account_id == account_id)
                      .order_by((OrderAutomation.status == 'active').desc(), OrderAutomation.automation_id.desc()).limit(200)).scalars().all()


def same_request(job, req):
    for field in ('symbol_code', 'order_type', 'quantity', 'kind', 'trigger_operator', 'trigger_price'):
        if getattr(job, field) != getattr(req, field):
            return False
    return utc(job.expires_at) == utc(req.expires_at) and (
        job.scheduled_at is None and req.scheduled_at is None or
        job.scheduled_at is not None and req.scheduled_at is not None and utc(job.scheduled_at) == utc(req.scheduled_at))


@router.post('', response_model=AutomationResponse)
async def register(req: AutomationRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    own_account(db, req.account_id, current_user.user_id)
    require_schema(db)
    # No lock across the external symbol lookup. Existing jobs already have a symbol row.
    security = db.get(ItemMaster, req.symbol_code)
    listed = None
    if security is None:
        try:
            listed = await get_listed_stock(req.symbol_code)
        except Exception:
            raise HTTPException(503, '종목 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.')
        if not listed or not listed.get('name'):
            raise HTTPException(404, '종목을 찾을 수 없습니다.')
    own_account(db, req.account_id, current_user.user_id, lock=True)
    existing = db.execute(select(OrderAutomation).where(
        OrderAutomation.account_id == req.account_id,
        OrderAutomation.client_request_id == str(req.client_request_id))).scalar_one_or_none()
    if existing:
        if not same_request(existing, req):
            raise HTTPException(409, '같은 등록 키에 다른 주문 내용을 사용할 수 없습니다.')
        return existing
    if not capabilities_data()['enabled']:
        raise HTTPException(503, '예약·조건 주문 감시가 준비되지 않았습니다.')
    try:
        req.validate_new()
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    count = db.query(OrderAutomation).filter_by(account_id=req.account_id, status='active').count()
    if count >= 20:
        raise HTTPException(409, '계좌당 활성 예약·조건 주문은 최대 20개입니다.')
    if security is None:
        # PostgreSQL conflict handling also covers concurrent registrations across accounts.
        from sqlalchemy.dialects.postgresql import insert
        if db.bind.dialect.name == 'postgresql':
            db.execute(insert(ItemMaster).values(symbol_code=req.symbol_code, name=listed['name'][:100], market_type='국내주식')
                       .on_conflict_do_nothing(index_elements=['symbol_code']))
        elif db.get(ItemMaster, req.symbol_code) is None:
            db.add(ItemMaster(symbol_code=req.symbol_code, name=listed['name'][:100], market_type='국내주식'))
            db.flush()
    values = req.model_dump(exclude={'client_request_id'})
    values['expires_at'] = utc(req.expires_at)
    if req.scheduled_at:
        values['scheduled_at'] = utc(req.scheduled_at)
    job = OrderAutomation(**values, client_request_id=str(req.client_request_id), status='active',
                          reason='예약 시각 대기' if req.kind == 'scheduled' else '가격 조건 감시 중')
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put('/{automation_id}/cancel', response_model=AutomationResponse)
def cancel(automation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_schema(db)
    job = db.execute(select(OrderAutomation).join(Account).where(
        OrderAutomation.automation_id == automation_id, Account.user_id == current_user.user_id)
        .with_for_update(of=OrderAutomation)).scalar_one_or_none()
    if job is None:
        raise HTTPException(404, '예약·조건 주문을 찾을 수 없습니다.')
    if job.status == 'cancelled':
        return job
    if job.status != 'active':
        raise HTTPException(409, '이미 종료된 예약·조건 주문은 취소할 수 없습니다.')
    job.status, job.reason = 'cancelled', '사용자가 실행 전에 취소했습니다.'
    db.commit()
    db.refresh(job)
    return job

"""Read-only market depth and recent market trades (never account orders).

Field contracts: koreainvestment/open-trading-api examples_llm/domestic_stock/
inquire_ccnl and inquire_asking_price_exp_ccn.
"""
import re
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException
from app.services import kis_service as kis


def integer(value):
    try:
        return int(str(value))
    except (ValueError, TypeError):
        return None


def market_time(value):
    value = str(value or '')
    if not re.fullmatch(r'(?:[01]\d|2[0-3])[0-5]\d[0-5]\d', value):
        return None
    return f'{value[:2]}:{value[2:4]}:{value[4:]}'


def parse_depth(payload):
    output = payload.get('output1')
    if not isinstance(output, dict):
        raise ValueError('Invalid depth response')
    sides = {}
    for side, prefix in [('asks', 'askp'), ('bids', 'bidp')]:
        levels = []
        for level in range(1, 11):
            price = integer(output.get(f'{prefix}{level}'))
            quantity = integer(output.get(f'{prefix}_rsqn{level}'))
            if price is not None and price > 0 and quantity is not None and quantity >= 0:
                levels.append(dict(price=price, quantity=quantity, level=level))
        sides[side] = levels
    return sides | {'market_time': market_time(output.get('aspr_acpt_hour'))}


def parse_trades(payload):
    output = payload.get('output')
    if not isinstance(output, list):
        raise ValueError('Invalid trades response')
    rows = []
    for row in output:
        if not isinstance(row, dict):
            continue
        time = market_time(row.get('stck_cntg_hour'))
        price, quantity = integer(row.get('stck_prpr')), integer(row.get('cntg_vol'))
        if time and price is not None and price > 0 and quantity is not None and quantity > 0:
            rows.append(dict(time=time, price=price, quantity=quantity))
    return {'rows': sorted(rows, key=lambda row: row['time'], reverse=True)}


async def get_market_details(symbol_code, kind):
    if not re.fullmatch(r'[A-Z0-9]{6}', symbol_code):
        raise HTTPException(422, '종목코드는 6자리 영문 대문자 또는 숫자여야 합니다.')
    if not kis.settings.KIS_APP_KEY or not kis.settings.KIS_APP_SECRET:
        raise HTTPException(503, '시세 조회 연결이 설정되지 않았습니다.')
    endpoint, tr_id, parser = {
        'orderbook': ('inquire-asking-price-exp-ccn', 'FHKST01010200', parse_depth),
        'trades': ('inquire-ccnl', 'FHKST01010300', parse_trades),
    }[kind]
    kis._assert_read_only(tr_id)
    try:
        token = await kis.get_kis_token()
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            response = await client.get(
                f'{kis.KIS_MOCK_URL}/uapi/domestic-stock/v1/quotations/{endpoint}',
                headers={'authorization': f'Bearer {token}', 'appkey': kis.settings.KIS_APP_KEY,
                         'appsecret': kis.settings.KIS_APP_SECRET, 'tr_id': tr_id, 'custtype': 'P'},
                params={'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': symbol_code},
            )
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict) or payload.get('rt_cd') != '0':
            raise ValueError('KIS rejected market request')
        return parser(payload) | {'symbol_code': symbol_code, 'market': 'KRX',
                                  'observed_at': datetime.now(timezone.utc).isoformat()}
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as error:
        raise HTTPException(503, '시장 데이터를 불러오지 못했습니다. 잠시 후 다시 조회해 주세요.') from error

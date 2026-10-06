"""Detailed history for the optional range parameter on the existing chart API.

Official KIS examples: koreainvestment/open-trading-api/examples_llm/domestic_stock/
inquire_time_itemchartprice, inquire_time_dailychartprice, inquire_daily_itemchartprice.
"""

import asyncio
import calendar
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from time import monotonic

import httpx

from app.services import kis_service as kis

KST = timezone(timedelta(hours=9))
_cache = OrderedDict()
_load_lock = asyncio.Lock()
_request_lock = asyncio.Lock()
_last_request = 0.0


class ChartUnavailable(Exception):
    pass


def _months_before(day: date, months: int) -> date:
    year, month = divmod(day.year * 12 + day.month - 1 - months, 12)
    return date(year, month + 1, min(day.day, calendar.monthrange(year, month + 1)[1]))


def _bar(item: dict, intraday=False):
    try:
        day = datetime.strptime(item['stck_bsop_date'], '%Y%m%d').date()
        row = dict(date=day.isoformat(), open=int(item['stck_oprc']),
                   high=int(item['stck_hgpr']), low=int(item['stck_lwpr']),
                   close=int(item['stck_prpr' if intraday else 'stck_clpr']),
                   volume=int(item.get('cntg_vol' if intraday else 'acml_vol') or 0))
        if min(row[k] for k in ('open', 'high', 'low', 'close')) <= 0:
            return None
        if not row['low'] <= min(row['open'], row['close']) <= max(row['open'], row['close']) <= row['high']:
            return None
        if intraday:
            clock = datetime.strptime(item['stck_cntg_hour'], '%H%M%S').time()
            row['time'] = clock.strftime('%H:%M:%S')
            if not '09:00:00' <= row['time'] <= '15:30:00':
                return None
        return row
    except (KeyError, TypeError, ValueError):
        return None


def _five_minutes(rows):
    groups = OrderedDict()
    for row in sorted(rows, key=lambda r: (r['date'], r['time'])):
        hour, minute, _ = map(int, row['time'].split(':'))
        clock = f'{hour:02}:{minute // 5 * 5:02}:00'
        key = (row['date'], clock)
        if key not in groups:
            groups[key] = {**row, 'time': clock}
        else:
            current = groups[key]
            current['high'] = max(current['high'], row['high'])
            current['low'] = min(current['low'], row['low'])
            current['close'] = row['close']
            current['volume'] += row['volume']
    return list(groups.values())


class _ChartClient:
    def __init__(self, client, real, token):
        self.client, self.real, self.token = client, real, token

    async def get(self, endpoint, tr_id, params):
        global _last_request
        kis._assert_read_only(tr_id)
        headers = {
            'authorization': f'Bearer {self.token}', 'tr_id': tr_id, 'custtype': 'P',
            'appkey': kis.settings.KIS_REAL_APP_KEY if self.real else kis.settings.KIS_APP_KEY,
            'appsecret': kis.settings.KIS_REAL_APP_SECRET if self.real else kis.settings.KIS_APP_SECRET,
        }
        base = kis.KIS_REAL_URL if self.real else kis.KIS_MOCK_URL
        # Serialize this new feature's calls and avoid bursts, including across symbols.
        async with _request_lock:
            await asyncio.sleep(max(0, (0.12 if self.real else 1.1) - (monotonic() - _last_request)))
            _last_request = monotonic()
            response = await self.client.get(f'{base}/uapi/domestic-stock/v1/quotations/{endpoint}',
                                             headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict) or str(data.get('rt_cd')) != '0':
            raise ChartUnavailable('KIS 차트 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.')
        output = data.get('output2')
        if not isinstance(output, list) or any(not isinstance(item, dict) for item in output):
            raise ChartUnavailable('KIS 차트 응답 형식을 확인할 수 없습니다.')
        return output


async def _daily(api, symbol, start, end):
    cursor, found = end, {}
    for _ in range(6):
        items = await api.get('inquire-daily-itemchartprice', 'FHKST03010100', {
            'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': symbol,
            'FID_INPUT_DATE_1': start.strftime('%Y%m%d'),
            'FID_INPUT_DATE_2': cursor.strftime('%Y%m%d'),
            'FID_PERIOD_DIV_CODE': 'D', 'FID_ORG_ADJ_PRC': '0',
        })
        if not items:
            break
        rows = [row for item in items if (row := _bar(item))]
        if not rows:
            raise ChartUnavailable('유효한 일별 차트 데이터를 받지 못했습니다.')
        for row in rows:
            if start.isoformat() <= row['date'] <= end.isoformat():
                found.setdefault(row['date'], row)
        oldest = date.fromisoformat(min(row['date'] for row in rows))
        if oldest <= start or len(items) < 100:
            break
        if oldest > cursor:
            raise ChartUnavailable('일별 차트의 다음 구간을 조회하지 못했습니다.')
        cursor = oldest - timedelta(days=1)
    else:
        raise ChartUnavailable('일별 차트 조회 범위를 초과했습니다.')
    return [found[key] for key in sorted(found)]


async def _minutes(api, symbol, day, now):
    # Never ask for future minutes: KIS may return synthetic copies of the last price.
    cursor = min(now.strftime('%H%M%S'), '153000') if day == now.date() else '153000'
    if cursor < '090000':
        return []
    found = {}
    for _ in range(20):
        params = {'FID_COND_MRKT_DIV_CODE': 'J', 'FID_INPUT_ISCD': symbol,
                  'FID_INPUT_HOUR_1': cursor, 'FID_PW_DATA_INCU_YN': 'Y'}
        if api.real:
            params.update(FID_INPUT_DATE_1=day.strftime('%Y%m%d'), FID_FAKE_TICK_INCU_YN='')
            endpoint, tr_id = 'inquire-time-dailychartprice', 'FHKST03010230'
        else:
            params['FID_ETC_CLS_CODE'] = ''
            endpoint, tr_id = 'inquire-time-itemchartprice', 'FHKST03010200'
        items = await api.get(endpoint, tr_id, params)
        if not items:
            break
        rows = [row for item in items if (row := _bar(item, intraday=True))
                and row['date'] == day.isoformat()
                and row['time'].replace(':', '') <= cursor]
        if not rows:
            # A page containing only earlier dates / pre-open rows means the session ended.
            if all(str(item.get('stck_bsop_date', '')) < day.strftime('%Y%m%d') or
                   str(item.get('stck_cntg_hour', '')) < '090000' for item in items):
                break
            raise ChartUnavailable('유효한 분봉 차트의 다음 구간을 조회하지 못했습니다.')
        for row in rows:
            found.setdefault(row['time'], row)
        oldest = min(row['time'] for row in rows)
        if oldest == '09:00:00':
            break
        cursor = (datetime.strptime(oldest, '%H:%M:%S') - timedelta(seconds=1)).strftime('%H%M%S')
        if cursor < '090000':
            break
    else:
        raise ChartUnavailable('분봉 차트 조회 범위를 초과했습니다.')
    return [found[key] for key in sorted(found)]


async def _load_history(symbol, span, now):
    real = bool(kis.settings.KIS_REAL_APP_KEY and kis.settings.KIS_REAL_APP_SECRET)
    if not real and not (kis.settings.KIS_APP_KEY and kis.settings.KIS_APP_SECRET):
        raise ChartUnavailable('차트 조회용 KIS API 키가 설정되지 않았습니다.')
    token = await (kis.get_real_kis_token() if real else kis.get_kis_token())
    today = now.date()
    notice = None
    # Mock TLS behavior matches the existing mock-only KIS client.
    async with httpx.AsyncClient(verify=real, timeout=15) as client:
        api = _ChartClient(client, real, token)
        if span in ('M', 'Y'):
            start = _months_before(today, 3 if span == 'M' else 12)
            rows = await _daily(api, symbol, start, today)
            resolution = '1d'
        elif span == 'D' and not real:
            rows = await _minutes(api, symbol, today, now)
            resolution = '1m'
            notice = '모의 API는 당일 분봉만 제공합니다. 휴장일에는 데이터가 없을 수 있습니다.'
        else:
            # Daily bars identify trading dates without guessing weekends or holidays.
            daily = await _daily(api, symbol, today - timedelta(days=14), today)
            latest = date.fromisoformat(daily[-1]['date']) if daily else today
            days = [r['date'] for r in daily if r['date'] > (latest - timedelta(days=7)).isoformat()]
            if span == 'D':
                days = days[-1:]
            if not real:
                rows = [r for r in daily if r['date'] in days]
                resolution = '1d'
                notice = '과거 분봉 조회용 실전 API 키가 없어 1주 차트를 일봉으로 표시합니다.'
            else:
                rows = []
                for day in days:
                    rows.extend(await _minutes(api, symbol, date.fromisoformat(day), now))
                if span == 'W':
                    rows = _five_minutes(rows)
                resolution = '5m' if span == 'W' else '1m'
    return {'rows': rows, 'range': span, 'resolution': resolution, 'notice': notice}


async def get_chart_history(symbol: str, span: str):
    if span not in ('D', 'W', 'M', 'Y'):
        raise ValueError('Unsupported chart range')
    # One load at a time also coalesces concurrent requests for the same chart.
    async with _load_lock:
        key = (symbol, span)
        cached = _cache.get(key)
        if cached and monotonic() - cached[0] < 60:
            _cache.move_to_end(key)
            return cached[1]
        result = await _load_history(symbol, span, datetime.now(KST))
        _cache[key] = (monotonic(), result)
        _cache.move_to_end(key)
        while len(_cache) > 128:
            _cache.popitem(last=False)
        return result

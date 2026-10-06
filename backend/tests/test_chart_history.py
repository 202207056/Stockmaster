"""Offline chart tests: no database, live KIS requests, or orders.

Run from backend: python -m unittest discover -s tests -v
"""
import asyncio
import os
import unittest
from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

# Import existing settings with harmless placeholders; never read real credentials.
os.environ.setdefault('DATABASE_URL', 'sqlite://')
os.environ.setdefault('SECRET_KEY', 'chart-test-only')

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.services import chart_history as chart
from app.routers import securities as route


def raw(day='20260916', time=None, close=110):
    item = dict(stck_bsop_date=day, stck_oprc='100', stck_hgpr='120',
                stck_lwpr='90', stck_clpr=str(close), acml_vol='10')
    if time:
        item.update(stck_cntg_hour=time, stck_prpr=str(close), cntg_vol='2')
    return item


class ChartTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        chart._cache.clear()
        chart._load_lock = asyncio.Lock()
        chart._request_lock = asyncio.Lock()
        self.settings = SimpleNamespace(KIS_APP_KEY='mock-test', KIS_APP_SECRET='mock-test',
                                        KIS_REAL_APP_KEY='real-test', KIS_REAL_APP_SECRET='real-test')
        self.settings_patch = patch.object(chart.kis, 'settings', self.settings)
        self.settings_patch.start()
        self.addCleanup(self.settings_patch.stop)
        self.now = datetime(2026, 9, 16, 10, 5, tzinfo=chart.KST)

    def test_calendar_boundaries_and_invalid_prices(self):
        self.assertEqual(chart._months_before(date(2024, 2, 29), 12), date(2023, 2, 28))
        self.assertEqual(chart._months_before(date(2026, 5, 31), 3), date(2026, 2, 28))
        self.assertIsNone(chart._bar(raw(close=0)))
        self.assertIsNone(chart._bar(raw(day='20260230')))
        self.assertIsNone(chart._bar(raw(time='160000'), True))

    async def test_year_daily_paginates_past_100_and_returns_every_day_sorted(self):
        end = date(2026, 9, 16)
        days = [end - timedelta(days=i) for i in range(366)]
        source = [raw(d.strftime('%Y%m%d')) for d in days if d.weekday() < 5]
        async def get(endpoint, tr_id, params):
            self.assertEqual(tr_id, 'FHKST03010100')
            return [r for r in source if params['FID_INPUT_DATE_1'] <= r['stck_bsop_date'] <= params['FID_INPUT_DATE_2']][:100]
        api = SimpleNamespace(get=AsyncMock(side_effect=get))
        result = await chart._daily(api, '005930', days[-1], end)
        self.assertEqual(len(result), len(source))
        self.assertGreater(len(result), 250)
        self.assertEqual(api.get.await_count, 3)
        self.assertEqual(result, sorted(result, key=lambda r: r['date']))

    async def test_repeated_daily_page_fails_instead_of_silently_truncating(self):
        api = SimpleNamespace(get=AsyncMock(return_value=[raw()] * 100))
        with self.assertRaises(chart.ChartUnavailable):
            await chart._daily(api, '005930', date(2025, 9, 16), self.now.date())

    async def test_mock_minutes_paginates_30_at_a_time_and_never_requests_future(self):
        source = [raw(time=(self.now.replace(hour=9, minute=0) + timedelta(minutes=i)).strftime('%H%M%S')) for i in range(391)]
        async def get(endpoint, tr_id, params):
            self.assertEqual(endpoint, 'inquire-time-itemchartprice')
            self.assertEqual(tr_id, 'FHKST03010200')
            self.assertLessEqual(params['FID_INPUT_HOUR_1'], '100500')
            return sorted([r for r in source if r['stck_cntg_hour'] <= params['FID_INPUT_HOUR_1']], key=lambda r: r['stck_cntg_hour'], reverse=True)[:30]
        api = SimpleNamespace(real=False, get=AsyncMock(side_effect=get))
        result = await chart._minutes(api, '005930', self.now.date(), self.now)
        self.assertEqual(len(result), 66)
        self.assertEqual(result[0]['time'], '09:00:00')
        self.assertEqual(result[-1]['time'], '10:05:00')
        self.assertEqual(api.get.await_count, 3)

    async def test_historical_minutes_paginates_and_deduplicates_overlap(self):
        day = date(2026, 9, 15)
        start = self.now.replace(day=15, hour=9, minute=0)
        source = [raw(day='20260915', time=(start + timedelta(minutes=i)).strftime('%H%M%S')) for i in range(391)]
        async def get(endpoint, tr_id, params):
            self.assertEqual(tr_id, 'FHKST03010230')
            self.assertEqual(params['FID_INPUT_DATE_1'], '20260915')
            rows = sorted([r for r in source if r['stck_cntg_hour'] <= params['FID_INPUT_HOUR_1']], key=lambda r: r['stck_cntg_hour'], reverse=True)[:120]
            return rows + rows[:1]
        api = SimpleNamespace(real=True, get=AsyncMock(side_effect=get))
        result = await chart._minutes(api, '005930', day, self.now)
        self.assertEqual(len(result), 391)
        self.assertEqual(api.get.await_count, 4)

    async def test_premarket_does_not_query_future_minutes(self):
        api = SimpleNamespace(real=False, get=AsyncMock())
        self.assertEqual(await chart._minutes(api, '005930', self.now.date(), self.now.replace(hour=8)), [])
        api.get.assert_not_awaited()

    def test_five_minute_aggregation_preserves_ohlc_and_separates_dates(self):
        rows = [chart._bar(raw(time='090100', close=115), True),
                chart._bar(raw(time='090000', close=105), True),
                chart._bar(raw(time='090500'), True),
                chart._bar(raw(day='20260915', time='090100'), True)]
        result = chart._five_minutes(rows)
        self.assertEqual(len(result), 3)
        self.assertEqual(result[1], dict(date='2026-09-16', time='09:00:00', open=100, high=120, low=90, close=115, volume=4))

    async def test_real_week_uses_trading_dates_and_five_minute_rows(self):
        daily = [chart._bar(raw(day=d)) for d in ['20260908', '20260910', '20260911', '20260914', '20260915', '20260916']]
        async def minutes(api, symbol, day, now):
            return [chart._bar(raw(day=day.strftime('%Y%m%d'), time='090000'), True),
                    chart._bar(raw(day=day.strftime('%Y%m%d'), time='090100'), True)]
        with patch.object(chart.kis, 'get_real_kis_token', AsyncMock(return_value='test')), \
             patch.object(chart, '_daily', AsyncMock(return_value=daily)), \
             patch.object(chart, '_minutes', AsyncMock(side_effect=minutes)) as minute_query:
            result = await chart._load_history('005930', 'W', self.now)
        self.assertEqual(result['resolution'], '5m')
        self.assertEqual(len(result['rows']), 5)
        self.assertEqual(minute_query.await_count, 5)
        self.assertEqual(result['rows'][0]['date'], '2026-09-10')

    async def test_mock_week_fallback_is_explicit_and_never_requests_real_token(self):
        self.settings.KIS_REAL_APP_KEY = ''
        with patch.object(chart.kis, 'get_kis_token', AsyncMock(return_value='test')), \
             patch.object(chart.kis, 'get_real_kis_token', AsyncMock()) as real_token, \
             patch.object(chart, '_daily', AsyncMock(return_value=[chart._bar(raw())])):
            result = await chart._load_history('005930', 'W', self.now)
        self.assertEqual(result['resolution'], '1d')
        self.assertTrue(result['notice'])
        real_token.assert_not_awaited()

    async def test_no_keys_is_an_error_and_does_not_issue_token(self):
        self.settings.KIS_REAL_APP_KEY = self.settings.KIS_APP_KEY = ''
        with patch.object(chart.kis, 'get_kis_token', AsyncMock()) as token:
            with self.assertRaises(chart.ChartUnavailable):
                await chart._load_history('005930', 'D', self.now)
        token.assert_not_awaited()

    async def test_cache_coalesces_concurrent_requests_and_does_not_cache_errors(self):
        result = dict(rows=[], range='D', resolution='1m', notice=None)
        with patch.object(chart, '_load_history', AsyncMock(return_value=result)) as load:
            await asyncio.gather(chart.get_chart_history('005930', 'D'), chart.get_chart_history('005930', 'D'))
            self.assertEqual(load.await_count, 1)
        with patch.object(chart, '_load_history', AsyncMock(side_effect=chart.ChartUnavailable('unavailable'))) as load:
            for _ in range(2):
                with self.assertRaises(chart.ChartUnavailable):
                    await chart.get_chart_history('000660', 'D')
            self.assertEqual(load.await_count, 2)

    async def test_kis_business_errors_and_malformed_output_are_not_empty_success(self):
        for payload in [{'rt_cd': '1', 'msg1': 'private upstream detail'}, {'rt_cd': '0', 'output2': [None]}]:
            transport = httpx.MockTransport(lambda req: httpx.Response(200, json=payload))
            async with httpx.AsyncClient(transport=transport) as client:
                api = chart._ChartClient(client, True, 'test')
                with self.assertRaises(chart.ChartUnavailable):
                    await api.get('inquire-time-dailychartprice', 'FHKST03010230', {})

    async def test_chart_client_only_uses_read_only_get(self):
        requests = []
        def handle(request):
            requests.append(request)
            return httpx.Response(200, json={'rt_cd': '0', 'output2': []})
        async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
            api = chart._ChartClient(client, True, 'test')
            await api.get('inquire-time-dailychartprice', 'FHKST03010230', {})
            with self.assertRaises(RuntimeError):
                await api.get('order-cash', 'TTTC0802U', {})
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].method, 'GET')


class RouteTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(route.router, prefix='/api/stocks')
        self.client = TestClient(app)

    def test_public_route_validates_range_and_symbol(self):
        with patch.object(route, 'get_chart_history', AsyncMock(return_value={'rows': []})) as load:
            self.assertEqual(self.client.get('/api/stocks/005930/chart?range=W').status_code, 200)
            load.assert_awaited_once_with('005930', 'W')
            self.assertEqual(self.client.get('/api/stocks/005930/chart?range=bad').status_code, 422)
            self.assertEqual(self.client.get('/api/stocks/invalid/chart?range=D').status_code, 422)

    def test_original_period_calls_keep_original_list_response(self):
        rows = [{'date': '20260916', 'open': 100, 'high': 120, 'low': 90, 'close': 110}]
        with patch.object(route, 'get_stock_chart', AsyncMock(return_value=rows)) as legacy, \
             patch.object(route, 'get_chart_history', AsyncMock()) as detailed:
            for period in ['D', 'W', 'M']:
                response = self.client.get(f'/api/stocks/005930/chart?period={period}')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), rows)
                legacy.assert_awaited_with('005930', period)
            self.assertEqual(self.client.get('/api/stocks/005930/chart').json(), rows)
            legacy.assert_awaited_with('005930', 'D')
            detailed.assert_not_awaited()

    def test_range_takes_precedence_without_calling_legacy_service(self):
        result = {'rows': [], 'range': 'Y', 'resolution': '1d', 'notice': None}
        with patch.object(route, 'get_chart_history', AsyncMock(return_value=result)) as detailed, \
             patch.object(route, 'get_stock_chart', AsyncMock()) as legacy:
            response = self.client.get('/api/stocks/005930/chart?period=M&range=Y')
            self.assertEqual(response.json(), result)
            detailed.assert_awaited_once_with('005930', 'Y')
            legacy.assert_not_awaited()

    def test_service_error_and_http_error_are_safe_responses(self):
        with patch.object(route, 'get_chart_history', AsyncMock(side_effect=chart.ChartUnavailable('unavailable'))):
            self.assertEqual(self.client.get('/api/stocks/005930/chart?range=D').status_code, 503)
        with patch.object(route, 'get_chart_history', AsyncMock(side_effect=httpx.ConnectError('secret'))):
            response = self.client.get('/api/stocks/005930/chart?range=D')
            self.assertEqual(response.status_code, 502)
            self.assertNotIn('secret', response.text)


if __name__ == '__main__':
    unittest.main()

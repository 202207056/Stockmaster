import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ.setdefault('DATABASE_URL', 'sqlite://')
os.environ.setdefault('SECRET_KEY', 'market-test-only')

import httpx
from app.services import kis_service as kis


def payload():
    return {'openTime': '20260928093000', 'closeTime': '20260928160000', 'priceInfos': [
        {'localDateTime': '20260927160000', 'currentPrice': 999},
        {'localDateTime': '20260928160000', 'currentPrice': 103},
        {'localDateTime': '20260928093100', 'currentPrice': 100},
        {'localDateTime': '20260928093900', 'currentPrice': 102},
        {'localDateTime': '20260928120000', 'currentPrice': 'NaN'},
        {'localDateTime': '20260928259900', 'currentPrice': 50},
        None,
    ]}


class MarketIntradayTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        kis._intraday_cache.clear()
        kis._index_cache.clear()

    def test_latest_day_buckets_invalid_values_and_sessions(self):
        chart = kis._naver_intraday(payload())
        self.assertEqual(chart['date'], '20260928')
        self.assertEqual(chart['session_start'], '093000')
        self.assertEqual(chart['session_end'], '160000')
        self.assertEqual(chart['points'], [{'time': '093000', 'value': 102}, {'time': '160000', 'value': 103}])
        fx = kis._naver_intraday({'priceInfos': [
            {'localDateTime': '20260929082349', 'currentPrice': 1360},
            {'localDateTime': '20260929170100', 'currentPrice': 1359},
        ]})
        self.assertEqual((fx['session_start'], fx['session_end']), ('082000', '170000'))
        self.assertIsNone(kis._naver_intraday({'priceInfos': []}))

    async def test_partial_failure_isolated_and_results_cached(self):
        get = AsyncMock(side_effect=[httpx.Response(200, json=payload()),
            httpx.Response(500), ValueError('offline'), httpx.Response(200, json=payload())])
        with patch.object(httpx.AsyncClient, 'get', get):
            result = await kis._fetch_naver_market_intradays()
            self.assertEqual(set(result), {'nasdaq', 'usd'})
            self.assertEqual(await kis._fetch_naver_market_intradays(), result)
            self.assertEqual(get.await_count, 4)

    async def test_response_includes_all_four_charts_when_kis_unavailable(self):
        charts = {code: kis._naver_intraday(payload()) for code in kis._NAVER_CHART_PATHS}
        with patch.object(kis, 'get_real_kis_token', AsyncMock(side_effect=ValueError('unavailable'))), \
             patch.object(kis, '_fetch_naver_market_quotes', AsyncMock(return_value={})), \
             patch.object(kis, '_fetch_naver_market_intradays', AsyncMock(return_value=charts)):
            result = await kis.get_market_indices()
        self.assertEqual(len(result), 6)
        self.assertTrue(all(item.get('intraday') for item in result[2:]))

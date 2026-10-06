import asyncio
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.stock_logos import router
from app.services import stock_logo_service as logos

PNG = "https://ssl.pstatic.net/imgstock/fn/real/logo/png/stock/Stock005930.png"
ETF = "https://ssl.pstatic.net/imgstock/fn/real/logo/png/etf/StockKRETFKODEX.png"


class StockLogoTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        logos._cache.clear()
        logos._pending.clear()
        logos._slots = asyncio.Semaphore(4)

    async def test_concurrent_requests_share_fetch_and_cache(self):
        response = httpx.Response(200, json={"itemCode": "005930", "itemLogoPngUrl": PNG},
                                  request=httpx.Request("GET", "https://m.stock.naver.com"))
        with patch.object(httpx.AsyncClient, 'get', new_callable=AsyncMock, return_value=response) as get:
            self.assertEqual(await asyncio.gather(*[logos.get_stock_logo('005930') for _ in range(3)]), [PNG] * 3)
            self.assertEqual(await logos.get_stock_logo('005930'), PNG)
            get.assert_awaited_once()

    def test_etf_and_svg_are_taken_from_response_and_untrusted_urls_rejected(self):
        self.assertEqual(logos._logo_url({'itemCode': '069500', 'itemLogoPngUrl': ETF}, '069500'), ETF)
        svg = PNG.replace('/png/', '/').replace('.png', '.svg')
        self.assertEqual(logos._logo_url({'itemCode': '005930', 'itemLogoUrl': svg}, '005930'), svg)
        self.assertIsNone(logos._logo_url({'itemCode': '000660', 'itemLogoPngUrl': PNG}, '005930'))
        for url in ('javascript:alert(1)', 'https://evil.example/logo.png', 'http://ssl.pstatic.net/imgstock/x', 'https://ssl.pstatic.net.evil.example/imgstock/x'):
            self.assertIsNone(logos._logo_url({'itemCode': '005930', 'itemLogoPngUrl': url}, '005930'))

    async def test_outage_is_optional_and_negative_result_cached(self):
        with patch.object(httpx.AsyncClient, 'get', new_callable=AsyncMock, side_effect=httpx.ConnectError('offline')) as get:
            self.assertIsNone(await logos.get_stock_logo('005930'))
            self.assertIsNone(await logos.get_stock_logo('005930'))
            self.assertIsNone(await logos.get_stock_logo('../other'))
            get.assert_awaited_once()

    def test_public_api_response_and_code_validation(self):
        app = FastAPI()
        app.include_router(router, prefix='/api/stocks')
        with TestClient(app) as client, patch('app.routers.stock_logos.get_stock_logo', new_callable=AsyncMock, return_value=PNG):
            response = client.get('/api/stocks/005930/logo')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {'symbol_code': '005930', 'logo_url': PNG})
            self.assertEqual(client.get('/api/stocks/invalid/logo').status_code, 422)


if __name__ == '__main__':
    unittest.main()

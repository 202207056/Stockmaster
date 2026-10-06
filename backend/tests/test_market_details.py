"""Offline checks for market-data adapters and read-only endpoints."""
import os
import unittest
from unittest.mock import AsyncMock, patch
os.environ.setdefault('DATABASE_URL', 'sqlite://')
os.environ.setdefault('SECRET_KEY', 'market-details-test-only')
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from app.services import market_details as market
from app.routers import securities


class MarketDetailsTests(unittest.TestCase):
    def test_depth_preserves_zero_quantity_and_filters_missing_values(self):
        data = market.parse_depth({'output1': {'askp1': '50100', 'askp_rsqn1': '0',
            'bidp1': '50000', 'bidp_rsqn1': '120', 'askp2': '50200',
            'bidp2': '0', 'bidp_rsqn2': '30', 'aspr_acpt_hour': '101530'}})
        self.assertEqual(data['asks'], [{'price': 50100, 'quantity': 0, 'level': 1}])
        self.assertEqual(len(data['bids']), 1)
        self.assertEqual(data['market_time'], '10:15:30')

    def test_trades_preserve_same_second_and_sort_latest_first(self):
        def row(time, quantity='3'):
            return dict(stck_cntg_hour=time, stck_prpr='50000', cntg_vol=quantity)
        data = market.parse_trades({'output': [row('090000'), row('101530'), row('101530'), row('999999'), row('101531', '-1')]})
        self.assertEqual([row['time'] for row in data['rows']], ['10:15:30', '10:15:30', '09:00:00'])

    def test_malformed_payload_is_not_an_empty_market(self):
        for parser in (market.parse_depth, market.parse_trades):
            with self.assertRaises(ValueError):
                parser({})

    def test_public_routes_and_upstream_unavailable(self):
        app = FastAPI()
        app.include_router(securities.router, prefix='/stocks')
        with TestClient(app) as client:
            with patch.object(securities, 'get_market_details', new=AsyncMock(return_value={'rows': []})) as loader:
                self.assertEqual(client.get('/stocks/005930/trades').status_code, 200)
                loader.assert_awaited_once_with('005930', 'trades')
            with patch.object(securities, 'get_market_details', new=AsyncMock(side_effect=HTTPException(503, 'Unavailable'))):
                self.assertEqual(client.get('/stocks/005930/orderbook').status_code, 503)


class MarketValidationTests(unittest.IsolatedAsyncioTestCase):
    async def test_invalid_symbol_never_requests_token(self):
        with patch.object(market.kis, 'get_kis_token', new=AsyncMock()) as token:
            with self.assertRaises(HTTPException) as error:
                await market.get_market_details('invalid', 'trades')
            self.assertEqual(error.exception.status_code, 422)
            token.assert_not_awaited()

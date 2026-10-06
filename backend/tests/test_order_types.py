"""Order types tested against an isolated SQLite DB and mocked read-only quotes."""
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from decimal import Decimal

os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SECRET_KEY'] = 'offline-order-tests'
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.models import User, Account, ItemMaster, Order, Portfolio
from app.routers import orders as routes
from app.utils.deps import get_current_user
from app.services.order_book import resolve_price


class OrderTypeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add_all([User(user_id=1, login_id='a', passwd='unused', user_name='a', email='a@test.example'),
                        User(user_id=2, login_id='b', passwd='unused', user_name='b', email='b@test.example')])
            db.add_all([Account(account_id=1, user_id=1, balance=1000000, withdrawable_cash=1000000),
                        Account(account_id=2, user_id=2, balance=1000000, withdrawable_cash=1000000),
                        ItemMaster(symbol_code='005930', name='테스트', market_type='국내주식')])
            db.commit()
        app = FastAPI()
        app.include_router(routes.router, prefix='/orders')
        def session():
            with self.Session() as db:
                yield db
        app.dependency_overrides[get_db] = session
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user_id=1)
        self.client = TestClient(app)
        self.book = {'bid': 49900, 'ask': 50100, 'bid_quantity': 100, 'ask_quantity': 100}
        self.book_patch = patch.object(routes, 'get_order_book', new=AsyncMock(side_effect=lambda _: dict(self.book)))
        self.quote_patch = patch.object(routes, 'get_current_price', new=AsyncMock(return_value={'current_price': 50000}))
        self.book_patch.start(); self.quote_patch.start()
        self.addCleanup(self.book_patch.stop); self.addCleanup(self.quote_patch.stop)
        self.addCleanup(self.client.close); self.addCleanup(self.engine.dispose)

    def order(self, kind='시장가', **changes):
        return self.client.post('/orders', json=dict(account_id=1, symbol_code='005930', order_type='매수',
                                quantity=2, price=50000, price_type=kind) | changes)

    def test_all_five_types_and_server_owned_prices(self):
        for kind, price, status in [('지정가', 100, '대기'), ('시장가', 50000, '체결'),
                                    ('중간가', 50000, '대기'), ('최유리지정가', 50100, '체결'), ('최우선지정가', 49900, '대기')]:
            with self.subTest(kind=kind):
                response = self.order(kind, price=100)
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertEqual(Decimal(result['price']), price)
                self.assertEqual(result['status'], status)

    def test_buy_fees_and_no_repeat_fill(self):
        result = self.order().json()
        self.assertEqual(Decimal(result['commission']), 15)
        self.assertEqual(Decimal(result['tax']), 0)
        self.client.post(f"/orders/{result['order_id']}/check")
        with self.Session() as db:
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 899985)
            self.assertEqual(db.query(Portfolio).first().hold_quantity, 2)

    def test_mid_reprices_but_best_own_is_fixed(self):
        mid = self.order('중간가').json()
        own = self.order('최우선지정가').json()
        self.book.update(bid=50900, ask=51100)
        checked_mid = self.client.post(f"/orders/{mid['order_id']}/check").json()
        checked_own = self.client.post(f"/orders/{own['order_id']}/check").json()
        self.assertEqual(Decimal(checked_mid['price']), 51000)
        self.assertEqual(Decimal(checked_own['price']), 49900)
        self.assertEqual(checked_mid['status'], '대기')
        self.book.update(bid=49800, ask=49900)
        self.assertEqual(self.client.post(f"/orders/{own['order_id']}/check").json()['status'], '체결')

    def test_limit_checks_and_cancel_do_not_double_spend(self):
        result = self.order('지정가').json()
        self.assertEqual(self.client.put(f"/orders/{result['order_id']}/cancel").status_code, 200)
        self.book.update(bid=49000, ask=49100)
        self.assertEqual(self.client.post(f"/orders/{result['order_id']}/check").json()['status'], '취소')
        with self.Session() as db:
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 1000000)

    def test_insufficient_quote_quantity_waits_without_cash_change(self):
        self.book['ask_quantity'] = 1
        result = self.order('최유리지정가').json()
        self.assertEqual(result['status'], '대기')
        with self.Session() as db:
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 1000000)

    def test_cash_rechecked_at_fill(self):
        result = self.order('지정가', quantity=20).json()
        self.assertNotIn('order_id', result, 'fee prevents buying 20 shares with exactly 1m cash')
        pending = self.order('지정가', quantity=19).json()
        self.order('시장가', quantity=19)
        self.book.update(bid=49000, ask=49100)
        checked = self.client.post(f"/orders/{pending['order_id']}/check").json()
        self.assertEqual(checked['status'], '거부')
        with self.Session() as db:
            self.assertGreaterEqual(db.get(Account, 1).withdrawable_cash, 0)

    def test_sell_uses_opposite_and_own_quotes(self):
        self.order(quantity=4)
        sell = self.order('최유리지정가', order_type='매도').json()
        self.assertEqual(Decimal(sell['price']), 49900)
        self.assertEqual(sell['status'], '체결')
        self.assertGreater(Decimal(sell['tax']), 0)
        own = self.order('최우선지정가', order_type='매도').json()
        self.assertEqual(Decimal(own['price']), 50100)
        self.assertEqual(own['status'], '대기')

    def test_missing_book_does_not_fall_back_to_current_price(self):
        self.book.update(bid=0)
        response = self.order('중간가')
        self.assertEqual(response.status_code, 400)
        with self.Session() as db:
            self.assertEqual(db.query(Order).count(), 0)

    def test_ownership_and_input_validation(self):
        self.assertEqual(self.order(account_id=2).status_code, 404)
        for changes in [{'price_type': 'invalid'}, {'quantity': 1000001}, {'price': 'NaN'}]:
            self.assertEqual(self.order(**changes).status_code, 422)
        self.assertEqual(self.client.post('/orders/999/check').status_code, 404)

    def test_odd_midpoint_rounds_down_to_won(self):
        self.assertEqual(resolve_price('중간가', '매수', dict(self.book, bid=10000, ask=10001)), 10000)


if __name__ == '__main__':
    unittest.main()

"""Offline DB/API tests. Never connects to a real account, database or KIS."""
import asyncio
import os
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SECRET_KEY'] = 'automation-offline-tests'

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import Account, ItemMaster, Order, Portfolio, User
from app.models.order_automation import OrderAutomation
from app.routers import order_automations as routes
from app.schemas.order_automation import AutomationRequest
from app.services import order_automation_service as service
from app.utils.deps import get_current_user

UTC = timezone.utc
real_capabilities = routes.capabilities_data


class AutomationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.now = datetime(2026, 10, 6, 1, 0, tzinfo=UTC)  # Tuesday 10:00 KST
        with self.Session() as db:
            db.add_all([User(user_id=1, login_id='one', passwd='unused', user_name='one', email='one@example.test'),
                        User(user_id=2, login_id='two', passwd='unused', user_name='two', email='two@example.test')])
            db.add_all([Account(account_id=1, user_id=1, balance=1000000, withdrawable_cash=1000000),
                        Account(account_id=2, user_id=2, balance=1000000, withdrawable_cash=1000000),
                        ItemMaster(symbol_code='005930', name='테스트', market_type='국내주식')])
            db.commit()
        app = FastAPI()
        app.include_router(routes.router, prefix='/automations')
        def session():
            with self.Session() as db:
                yield db
        app.dependency_overrides[get_db] = session
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user_id=1)
        self.client = TestClient(app)
        self.ready = patch.object(routes, 'capabilities_data', return_value={'enabled': True})
        self.ready.start()
        self.addCleanup(self.ready.stop)
        self.addCleanup(self.client.close)
        self.addCleanup(self.engine.dispose)

    def request(self, **changes):
        value = dict(account_id=1, symbol_code='005930', order_type='매수', quantity=1,
                     kind='condition', trigger_operator='lte', trigger_price=50000,
                     expires_at=(datetime.now(UTC) + timedelta(days=1)).isoformat(), client_request_id=str(uuid4()))
        return value | changes

    def job(self, **changes):
        with self.Session() as db:
            job = OrderAutomation(**(dict(account_id=1, symbol_code='005930', order_type='매수', quantity=1,
                kind='condition', trigger_operator='lte', trigger_price=50000,
                expires_at=self.now + timedelta(days=1), created_at=self.now - timedelta(minutes=5),
                client_request_id=str(uuid4()), status='active') | changes))
            db.add(job); db.commit()
            return job.automation_id

    def process(self, job_id, price=50000, now=None, age=0):
        now = now or self.now
        with self.Session() as db:
            service.process_one(db, job_id, {'price': price, 'observed_at': now - timedelta(seconds=age)}, now)
            db.commit()
            return db.get(OrderAutomation, job_id).status

    def test_registration_has_no_cash_effect_and_retries_are_idempotent(self):
        payload = self.request()
        first = self.client.post('/automations', json=payload)
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.post('/automations', json=payload)
        self.assertEqual(first.json()['automation_id'], second.json()['automation_id'])
        self.assertEqual(self.client.post('/automations', json=payload | {'quantity': 2}).status_code, 409)
        with self.Session() as db:
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 1000000)
            self.assertEqual(db.query(Order).count(), 0)

    def test_ownership_for_list_register_cancel(self):
        self.assertEqual(self.client.get('/automations?account_id=2').status_code, 404)
        self.assertEqual(self.client.post('/automations', json=self.request(account_id=2)).status_code, 404)
        job_id = self.job(account_id=2)
        self.assertEqual(self.client.put(f'/automations/{job_id}/cancel').status_code, 404)

    def test_input_validation_timezone_limits_and_mixed_fields(self):
        for changes in ({'quantity': 0}, {'quantity': 1.5}, {'trigger_price': -1}, {'trigger_price': 'NaN'},
                        {'expires_at': '2026-10-07T12:00:00'}, {'symbol_code': '123'},
                        {'kind': 'scheduled'}, {'scheduled_at': (self.now + timedelta(hours=1)).isoformat()},
                        {'expires_at': (datetime.now(UTC) + timedelta(days=31)).isoformat()},
                        {'expires_at': (datetime.now(UTC) - timedelta(seconds=1)).isoformat()}):
            response = self.client.post('/automations', json=self.request(**changes))
            self.assertEqual(response.status_code, 422, response.text)
        request = AutomationRequest(**self.request())
        with self.assertRaises(ValueError):
            request.validate_new(datetime.now(UTC) + timedelta(days=2))

    def test_exact_threshold_executes_once_and_charges_fee(self):
        job_id = self.job()
        self.assertEqual(self.process(job_id, 50001), 'active')
        self.assertEqual(self.process(job_id, 50000), 'executed')
        self.assertEqual(self.process(job_id, 49000), 'executed')
        with self.Session() as db:
            self.assertEqual(db.query(Order).count(), 1)
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 949992)
            order = db.query(Order).one()
            self.assertEqual(order.commission, 8)
            self.assertEqual(order.tax, 0)
            self.assertEqual(db.query(Portfolio).one().avg_price, 50000)

    def test_sell_gte_deducts_fee_and_tax(self):
        with self.Session() as db:
            db.add(Portfolio(account_id=1, symbol_code='005930', hold_quantity=2, avg_price=40000))
            db.commit()
        job_id = self.job(order_type='매도', trigger_operator='gte')
        self.assertEqual(self.process(job_id, 49999), 'active')
        self.assertEqual(self.process(job_id, 50000), 'executed')
        with self.Session() as db:
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 1049902)
            self.assertEqual(db.query(Portfolio).one().hold_quantity, 1)

    def test_insufficient_cash_or_holding_rejects_without_order(self):
        buy = self.job(quantity=21)
        sell = self.job(order_type='매도')
        self.assertEqual(self.process(buy), 'rejected')
        self.assertEqual(self.process(sell), 'rejected')
        with self.Session() as db:
            self.assertEqual(db.query(Order).count(), 0)
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 1000000)

    def test_schedule_and_expiry_boundaries(self):
        job_id = self.job(kind='scheduled', scheduled_at=self.now + timedelta(minutes=1), trigger_price=None, trigger_operator=None)
        self.assertEqual(self.process(job_id), 'active')
        self.assertEqual(self.process(job_id, now=self.now + timedelta(minutes=1)), 'executed')
        expired = self.job(expires_at=self.now)
        self.assertEqual(self.process(expired), 'expired')

    def test_stale_future_weekend_and_out_of_hours_quotes_do_not_execute(self):
        job_id = self.job(expires_at=self.now + timedelta(days=10))
        self.assertEqual(self.process(job_id, age=121), 'active')
        self.assertEqual(self.process(job_id, age=-1), 'active')
        self.assertEqual(self.process(job_id, now=self.now + timedelta(days=4)), 'active')
        self.assertEqual(self.process(job_id, now=self.now + timedelta(hours=6)), 'active')
        self.assertEqual(self.process(job_id, price=0), 'active')

    def test_cancel_is_idempotent_and_prevents_execution(self):
        job_id = self.job()
        for _ in range(2):
            self.assertEqual(self.client.put(f'/automations/{job_id}/cancel').json()['status'], 'cancelled')
        self.assertEqual(self.process(job_id), 'cancelled')
        other = self.job(); self.process(other)
        self.assertEqual(self.client.put(f'/automations/{other}/cancel').status_code, 409)

    def test_atomic_rollback_and_restart_cycle(self):
        job_id = self.job()
        with self.Session() as db:
            service.process_one(db, job_id, {'price': 50000, 'observed_at': self.now}, self.now)
            db.rollback()
        with self.Session() as db:
            self.assertEqual(db.query(Order).count(), 0)
            self.assertEqual(db.get(Account, 1).withdrawable_cash, 1000000)
        loader = AsyncMock(return_value={'price': 50000, 'observed_at': self.now})
        asyncio.run(service.run_cycle(self.Session, loader, self.now))
        asyncio.run(service.run_cycle(self.Session, loader, self.now))
        with self.Session() as db:
            self.assertEqual(db.query(Order).count(), 1)
            self.assertEqual(db.get(OrderAutomation, job_id).status, 'executed')

    def test_feed_failure_remains_active_until_expiry(self):
        job_id = self.job()
        asyncio.run(service.run_cycle(self.Session, AsyncMock(side_effect=RuntimeError('do not expose')), self.now))
        with self.Session() as db:
            job = db.get(OrderAutomation, job_id)
            self.assertEqual(job.status, 'active')
            self.assertNotIn('do not expose', job.reason)

    def test_disabled_monitor_rejects_new_registration_but_allows_existing_retry(self):
        payload = self.request()
        response = self.client.post('/automations', json=payload)
        self.assertEqual(response.status_code, 200)
        with patch.object(routes, 'capabilities_data', return_value={'enabled': False}):
            self.assertEqual(self.client.post('/automations', json=payload).status_code, 200)
            self.assertEqual(self.client.post('/automations', json=self.request()).status_code, 503)

    def test_cash_check_includes_fee_and_two_sell_jobs_cannot_oversell(self):
        with self.Session() as db:
            db.get(Account, 1).withdrawable_cash = 50000
            db.add(Portfolio(account_id=1, symbol_code='005930', hold_quantity=1, avg_price=40000))
            db.commit()
        self.assertEqual(self.process(self.job()), 'rejected')
        self.assertEqual(self.process(self.job(order_type='매도')), 'executed')
        self.assertEqual(self.process(self.job(order_type='매도')), 'rejected')
        with self.Session() as db:
            self.assertEqual(db.query(Order).count(), 1)

    def test_active_limit_and_completed_retry_after_expiry(self):
        for _ in range(20):
            self.job()
        self.assertEqual(self.client.post('/automations', json=self.request()).status_code, 409)
        payload = self.request(expires_at=(self.now + timedelta(hours=1)).isoformat())
        job_id = self.job(client_request_id=payload['client_request_id'], expires_at=self.now + timedelta(hours=1))
        self.process(job_id)
        self.assertEqual(self.client.post('/automations', json=payload).json()['status'], 'executed')

    def test_missing_schema_returns_service_unavailable(self):
        OrderAutomation.__table__.drop(self.engine)
        self.assertEqual(self.client.get('/automations?account_id=1').status_code, 503)

    def test_migration_upgrade_and_downgrade_on_isolated_db(self):
        from importlib.util import spec_from_file_location, module_from_spec
        from alembic.migration import MigrationContext
        from alembic.operations import Operations
        from sqlalchemy import inspect
        spec = spec_from_file_location('automation_migration', 'alembic/versions/d20261006_order_automations.py')
        migration = module_from_spec(spec); spec.loader.exec_module(migration)
        OrderAutomation.__table__.drop(self.engine)
        with self.engine.begin() as conn:
            migration.op = Operations(MigrationContext.configure(conn))
            migration.upgrade()
            self.assertTrue(inspect(conn).has_table('order_automations'))
            migration.downgrade()
            self.assertFalse(inspect(conn).has_table('order_automations'))

    def test_feed_adapter_uses_dated_nonzero_volume_and_no_future_quotes(self):
        items = [dict(stck_bsop_date='20261006', stck_cntg_hour='100000', stck_prpr='50000', cntg_vol='10'),
                 dict(stck_bsop_date='20261006', stck_cntg_hour='100100', stck_prpr='99000', cntg_vol='10'),
                 dict(stck_bsop_date='20261005', stck_cntg_hour='100000', stck_prpr='99000', cntg_vol='10')]
        with patch.object(service.kis, 'settings', SimpleNamespace(KIS_REAL_APP_KEY='', KIS_REAL_APP_SECRET='', KIS_APP_KEY='test', KIS_APP_SECRET='test')), \
             patch.object(service.kis, 'get_kis_token', AsyncMock(return_value='test')), \
             patch.object(service._ChartClient, 'get', AsyncMock(return_value=items)) as get:
            result = asyncio.run(service.fetch_execution_quote('005930', self.now))
            self.assertEqual(result['price'], 50000)
            self.assertEqual(get.call_args.args[1], 'FHKST03010200')
            items[0]['cntg_vol'] = '0'
            self.assertIsNone(asyncio.run(service.fetch_execution_quote('005930', self.now)))

    def test_capabilities_require_recent_monitor_and_quote_credentials(self):
        config = SimpleNamespace(ENABLE_ORDER_AUTOMATIONS=True, KIS_APP_KEY='test', KIS_APP_SECRET='test',
                                 KIS_REAL_APP_KEY='', KIS_REAL_APP_SECRET='')
        with patch.object(routes, 'settings', config), patch.dict(service.monitor_state, running=True, last_cycle_at=datetime.now(UTC)):
            self.assertTrue(real_capabilities()['enabled'])
            service.monitor_state['last_cycle_at'] -= timedelta(minutes=3)
            self.assertFalse(real_capabilities()['enabled'])
            service.monitor_state['last_cycle_at'] = datetime.now(UTC)
            config.KIS_APP_KEY = ''
            self.assertFalse(real_capabilities()['enabled'])

    def test_unseeded_symbol_lookup_and_failure(self):
        with patch.object(routes, 'get_listed_stock', AsyncMock(return_value={'name': '추가종목'})):
            self.assertEqual(self.client.post('/automations', json=self.request(symbol_code='373220')).status_code, 200)
        with self.Session() as db:
            self.assertEqual(db.get(ItemMaster, '373220').name, '추가종목')
        with patch.object(routes, 'get_listed_stock', AsyncMock(return_value=None)):
            self.assertEqual(self.client.post('/automations', json=self.request(symbol_code='999999')).status_code, 404)
        with self.Session() as db:
            self.assertIsNone(db.get(ItemMaster, '999999'))


if __name__ == '__main__':
    unittest.main()

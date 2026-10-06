import test from 'node:test';
import assert from 'node:assert/strict';
import { automationPayload, koreaInput, koreaToIso, automationStatus } from '../src/utils/orderAutomations.js';

const now = Date.parse('2026-10-06T01:00:00Z');
const form = { kind: 'scheduled', side: '매수', quantity: '2', scheduled: '2026-10-06T11:00', expires: '2026-10-07T15:00' };
test('Korean datetime inputs do not depend on the machine timezone', () => {
  assert.equal(koreaInput(now), '2026-10-06T10:00');
  assert.equal(koreaToIso(form.scheduled), '2026-10-06T02:00:00.000Z');
  assert.throws(() => koreaToIso('2026-02-30T10:00'));
  assert.throws(() => koreaToIso('2026-10-06'));
});
test('scheduled and condition payloads include only their relevant fields', () => {
  const scheduled = automationPayload(form, 1, '005930', 'key', now);
  assert.equal(scheduled.quantity, 2);
  assert.equal(scheduled.trigger_price, undefined);
  const conditional = automationPayload({ ...form, kind: 'condition', trigger: '50000', operator: 'gte' }, 1, '005930', 'key', now);
  assert.equal(conditional.scheduled_at, undefined);
  assert.equal(conditional.trigger_price, 50000);
  assert.equal(conditional.trigger_operator, 'gte');
});
test('past, inverted and too-long windows, non-integer quantity and invalid conditions are rejected', () => {
  for (const changes of [{ scheduled: '2026-10-06T09:00' }, { expires: form.scheduled }, { expires: '2026-11-07T10:00' },
    { quantity: '1.5' }, { quantity: '0' }, { kind: 'condition', trigger: '0', operator: 'gte' }]) {
    assert.throws(() => automationPayload({ ...form, ...changes }, 1, '005930', 'key', now));
  }
  assert.equal(automationStatus({ kind: 'condition', status: 'active' }), '감시중');
  assert.equal(automationStatus({ kind: 'scheduled', status: 'active' }), '예약대기');
  assert.equal(automationStatus({ status: 'executed' }), '체결');
});

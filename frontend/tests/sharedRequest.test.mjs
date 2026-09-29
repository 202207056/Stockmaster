import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedRequest, abortableDelay } from '../src/api/sharedRequest.js';

test('concurrent portfolio readers share a request and one cancellation leaves the other alive', async () => {
  let calls = 0; let complete; let upstream;
  const read = createSharedRequest((signal) => { calls++; upstream = signal; return new Promise((resolve) => { complete = resolve; }); });
  const first = new AbortController();
  const a = read('session:account', first.signal);
  const b = read('session:account');
  await Promise.resolve();
  first.abort();
  await assert.rejects(a, { name: 'AbortError' });
  assert.equal(upstream.aborted, false);
  complete({ cash: 100 });
  assert.deepEqual(await b, { cash: 100 });
  assert.equal(calls, 1);
});

test('different accounts and sessions do not share requests and completed reads are refreshed', async () => {
  let calls = 0;
  const read = createSharedRequest(async () => ++calls);
  await Promise.all([read('session1:account1'), read('session1:account2'), read('session2:account1')]);
  assert.equal(calls, 3);
  await read('session1:account1');
  assert.equal(calls, 4);
});

test('all consumers cancelling aborts upstream and permits a fresh request', async () => {
  const signals = [];
  const read = createSharedRequest(async (signal) => { signals.push(signal); await abortableDelay(20, signal); return 1; });
  const controller = new AbortController();
  const first = read('key', controller.signal);
  await Promise.resolve();
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(signals[0].aborted, true);
  assert.equal(await read('key'), 1);
  assert.equal(signals.length, 2);
});

test('failed requests are not cached and aborted backoff stops immediately', async () => {
  let calls = 0;
  const read = createSharedRequest(async () => { if (++calls === 1) throw new Error('offline'); return 'recovered'; });
  await assert.rejects(read('key'), /offline/);
  assert.equal(await read('key'), 'recovered');
  const controller = new AbortController();
  const waiting = abortableDelay(60_000, controller.signal);
  controller.abort();
  await assert.rejects(waiting, { name: 'AbortError' });
});

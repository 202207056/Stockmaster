import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

globalThis.localStorage = { getItem: () => null };
globalThis.window = new EventTarget();
const server = await createServer({
  cacheDir: 'node_modules/.vite-chart-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
});
after(() => server.close());
const { default: api } = await server.ssrLoadModule('/src/api/client.js');
const { fetchChartHistory } = await server.ssrLoadModule('/src/api/chartHistory.js');
const base = { date: '20260916', open: 100, high: 120, low: 90, close: 110, volume: 1 };

test('intraday adapter keeps distinct minutes on one day and forwards range and cancellation', async () => {
  const controller = new AbortController();
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/stocks/005930/chart');
    assert.equal(config.params.range, 'D');
    assert.equal(config.signal, controller.signal);
    return { status: 200, headers: {}, config, data: { range: 'D', resolution: '1m', rows: [
      { ...base, time: '09:02:00' }, { ...base, time: '09:00:00' },
      { ...base, time: '09:01:00' }, { ...base, time: '09:01:00', close: 115 },
      { ...base, time: '16:00:00' }, { ...base, time: '09:03:00', close: 0 }, null,
    ] } };
  };
  const result = await fetchChartHistory('005930', 'D', controller.signal);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows.map(row => row.time), ['09:00:00', '09:01:00', '09:02:00']);
  assert.equal(result.rows[1].close, 115);
  assert.equal(result.rows[1].label, '2026-09-16 09:01');
  assert.equal(result.rows[1].key, '2026-09-16T09:01:00');
});

test('yearly view retains all daily prices and notices are preserved for fallback data', async () => {
  const rows = Array.from({ length: 260 }, (_, index) => ({ ...base, date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10) }));
  api.defaults.adapter = async (config) => ({ status: 200, headers: {}, config, data: { range: config.params.range, resolution: '1d', notice: 'fallback', rows } });
  const result = await fetchChartHistory('005930', 'Y');
  assert.equal(result.rows.length, 260);
  assert.equal(result.notice, 'fallback');
});

test('malformed or mismatched API responses fail explicitly rather than displaying a misleading chart', async () => {
  for (const payload of [null, { range: 'M', resolution: '1m', rows: [] }, { range: 'D', resolution: 'unknown', rows: [] }]) {
    api.defaults.adapter = async (config) => ({ status: 200, headers: {}, config, data: payload });
    await assert.rejects(fetchChartHistory('005930', 'D'));
  }
});

test('minute chart renders every timestamp and a continuous line without dots', async () => {
  const { default: Chart } = await server.ssrLoadModule('/src/components/common/CandleChart.jsx');
  const rows = ['09:00', '09:01', '09:02'].map(time => ({ ...base, date: '2026-09-16', key: time, label: `2026-09-16 ${time}` }));
  const markup = renderToString(React.createElement(Chart, { rows, type: 'line', periodLabel: '1일' }));
  for (const row of rows) assert.ok(markup.includes(row.label));
  assert.ok(markup.includes('<polyline'));
  assert.ok(!markup.includes('<circle'));
  assert.ok(!markup.includes('NaN'));
});

test('older deployment returns usable legacy data in one request with the actual range labeled', async () => {
  const requests = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, headers: {}, config, data: [base, { ...base, date: '20260915' }] };
  };
  const result = await fetchChartHistory('005930', 'D');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/stocks/005930/chart');
  assert.deepEqual(requests[0].params, { range: 'D', period: 'D' });
  assert.equal(result.rows.length, 2);
  assert.equal(result.resolution, '1d');
  assert.equal(result.displayLabel, '최근 2거래일');
  assert.ok(result.notice.includes('장중'));
});

test('legacy fallback keeps weekly/monthly periods and does not hide real server failures', async () => {
  for (const [range, period, resolution] of [['W', 'D', '1d'], ['M', 'W', '1w'], ['Y', 'M', '1mo']]) {
    api.defaults.adapter = async (config) => {
      assert.equal(config.params.period, period);
      return { status: 200, headers: {}, config, data: [base] };
    };
    assert.equal((await fetchChartHistory('005930', range)).resolution, resolution);
  }
  for (const status of [401, 429, 500, 503]) {
    let calls = 0;
    api.defaults.adapter = async (config) => {
      calls += 1;
      throw Object.assign(new Error('failed'), { response: { status }, config });
    };
    await assert.rejects(fetchChartHistory('005930', 'D'));
    assert.equal(calls, 1);
  }
});

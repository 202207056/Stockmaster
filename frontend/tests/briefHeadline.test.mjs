import test from 'node:test';
import assert from 'node:assert/strict';
import { savedNewsHeadline } from '../src/utils/briefHeadline.js';

const now = Date.parse('2026-11-02T12:00:00+09:00');
const item = { symbol_code: '000660', generated_at: new Date(now - 1000).toISOString(),
  headline: '신규 메모리 공급 계약을 발표했습니다.[1] 생산도 확대합니다.[1]', sources: [{ title: '공급 계약 발표' }] };

test('uses the newest matching news headline, removes citations and keeps its first sentence', () => {
  assert.deepEqual(savedNewsHeadline([
    { ...item, generated_at: new Date(now - 2000).toISOString(), headline: '이전 소식입니다.[1]' }, item,
    { ...item, symbol_code: '005930', headline: '다른 종목입니다.[1]' },
  ], '000660', now), { short: '신규 메모리 공급 계약을 발표했습니다.', full: '신규 메모리 공급 계약을 발표했습니다. 생산도 확대합니다.' });
});

test('does not present stale, future, uncited or unsupported holding headlines as news', () => {
  for (const change of [
    { generated_at: new Date(now - 86400001).toISOString() },
    { generated_at: new Date(now + 1).toISOString() },
    { headline: '현재 10주 보유 중입니다.' }, { sources: [] }, { headline: '공급 계약입니다.[2]' },
  ]) assert.equal(savedNewsHeadline([{ ...item, ...change }], '000660', now).short, '');
});

test('long headlines are visibly shortened while retaining the full text', () => {
  const headline = '반도체 공급 계약과 신규 생산 설비 확충에 관한 구체적인 일정 및 주요 계약 내용을 회사가 발표했습니다.';
  const result = savedNewsHeadline([{ ...item, headline: headline + '[1]' }], '000660', now);
  assert.ok(result.short.length <= 48);
  assert.ok(result.short.endsWith('…'));
  assert.equal(result.full, headline);
});

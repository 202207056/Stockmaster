import test from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY } from '../src/constants/glossary.js';
import { findDetectedTerms, findTermSpans } from '../src/features/ocr/terms.js';
import { validateDetected } from '../src/features/ocr/readMarks.js';
import { ownerOf, readLast, writeLast } from '../src/features/ocr/lastAnalysis.js';
import { collectPageMarks, shiftArea } from '../src/features/ocr/pageMarkRanges.js';
import { JSDOM } from 'jsdom';

test('term spans point at the words in the read paragraph', () => {
  const text = '오늘 삼성전자 영업이익이 늘었고 배당도 올렸다.';
  const spans = findTermSpans(text, GLOSSARY);
  assert.ok(spans.length > 0);
  assert.ok(spans.some((span) => text.slice(span.start, span.end) === '영업이익'));
  assert.deepEqual([...new Set(spans.map(({ id }) => id))], findDetectedTerms(text, GLOSSARY));
});

test('malformed AI rows are dropped', () => {
  assert.deepEqual(validateDetected({ terms: [{ term: '성료', tier: 'general', meaning: '잘 끝남', extra: 1 }, { term: '', tier: 'invest', meaning: 'x' },
    { term: '성료', tier: 'general', meaning: '중복' }, { term: '수급', tier: 'other', meaning: 'x' }] }), [{ term: '성료', tier: 'general', meaning: '잘 끝남', basic: false, code: null, basis: 'knowledge', facts: null }]);
  assert.throws(() => validateDetected({}));
});

// Each paragraph sits on its own 20px row and every character is 10px wide.
function page(html) {
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const rows = new Map([...dom.window.document.querySelectorAll('p')].map((p, index) => [p, index]));
  dom.window.Range.prototype.getClientRects = function getClientRects() {
    const row = rows.get(this.startContainer.parentElement) ?? 0;
    const start = this.startContainer === this.endContainer && this.startOffset !== this.endOffset ? this.startOffset : 0;
    const end = this.startContainer === this.endContainer && this.startOffset !== this.endOffset ? this.endOffset : this.startContainer.data.length;
    return [{ left: start * 10, right: end * 10, top: row * 20, bottom: row * 20 + 18, width: (end - start) * 10, height: 18 }];
  };
  return dom;
}

test('found words are marked in place only inside the captured area', () => {
  const dom = page('<p>영업이익이 늘었다</p><p>호재가 겹친 영업이익</p><p>영업이익</p><div data-ocr-widget><p>호재</p></div>');
  const marks = collectPageMarks({ left: 0, top: 20, right: 200, bottom: 38 }, GLOSSARY, [{ term: '호재', tier: 'invest', meaning: '좋은 소식' }], dom.window.document.body);
  assert.deepEqual(marks.map((mark) => [mark.id, mark.range.toString(), mark.order]), [['ai:호재', '호재', 0], ['operating_profit', '영업이익', 0]]);
  assert.equal(new Set(marks.map((mark) => mark.key)).size, 2);
});

test('the captured area follows the window scroll', () => {
  assert.deepEqual(shiftArea({ area: { left: 0, top: 100, right: 50, bottom: 150 }, scrollX: 0, scrollY: 0 }, 0, 40), { left: 0, right: 50, top: 60, bottom: 110 });
});

test('company rows keep a listed stock code only when it is well formed', () => {
  assert.deepEqual(validateDetected({ terms: [
    { term: '삼성전자', tier: 'company', meaning: '전자 회사', symbol_code: '005930' },
    { term: '엔비디아', tier: 'company', meaning: '반도체 회사', symbol_code: null },
    { term: '호재', tier: 'invest', meaning: '좋은 소식', symbol_code: '005930' },
    { term: '가짜', tier: 'company', meaning: 'x', symbol_code: '../x' }] }).map(({ term, code }) => [term, code]),
  [['삼성전자', '005930'], ['엔비디아', null], ['호재', null], ['가짜', null]]);
});

function memory() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
}

test('the last result comes back for the same login only, with its time', () => {
  const storage = memory();
  const owner = ownerOf('token-a');
  const capture = { kind: 'region', path: '/dashboard', area: { left: 0, top: 0, right: 10, bottom: 10 }, scrollX: 0, scrollY: 5, fresh: true, key: 1 };
  writeLast(owner, { at: 1000, source: 'region', text: '호재', pageTerms: ['stock', 'nope'], tab: 'company', capture,
    terms: [{ term: '호재', tier: 'invest', meaning: '좋은 소식', basic: false, code: null }] }, storage);
  const back = readLast(owner, GLOSSARY, storage);
  assert.equal(back.at, 1000);
  assert.deepEqual(back.pageTerms, ['stock']);
  assert.equal(back.tab, 'company');
  assert.equal(back.capture.fresh, false);
  assert.equal(back.terms[0].term, '호재');
  assert.equal(readLast(ownerOf('token-b'), GLOSSARY, storage), null);
  storage.setItem('stockmaster:term-analyzer-last', '{broken');
  assert.equal(readLast(owner, GLOSSARY, storage), null);
});

test('every place an AI word appears is marked, and the full name wins over its part', () => {
  const dom = page('<p>삼성생명은 삼성생명 계열</p><p>엘리엇 인베스트먼트와 엘리엇</p>');
  const terms = [{ term: '삼성생명', tier: 'company' }, { term: '엘리엇', tier: 'company' }, { term: '엘리엇 인베스트먼트', tier: 'company' }];
  const marks = collectPageMarks({ left: 0, top: 0, right: 400, bottom: 40 }, GLOSSARY, terms, dom.window.document.body);
  assert.deepEqual(marks.map((mark) => mark.range.toString()), ['삼성생명', '삼성생명', '엘리엇 인베스트먼트', '엘리엇']);
});

test('company facts are kept short and only for companies', () => {
  const [nvidia, pay, word] = validateDetected({ terms: [
    { term: '엔비디아', tier: 'company', meaning: '반도체', listing: '미국 나스닥', index: 'S&P 500', sector: '반도체', size: '초대형', basis: 'knowledge' },
    { term: '페이허브', tier: 'company', meaning: '이 글에서는 PG사', listing: '가'.repeat(30), size: '거대', basis: 'context', listing_checked: true },
    { term: '호재', tier: 'invest', meaning: '좋은 소식', listing: '코스피', basis: 'context' }] });
  assert.deepEqual(nvidia.facts, { listing: '미국 나스닥', index: 'S&P 500', sector: '반도체', size: '초대형', checked: false });
  assert.equal(pay.basis, 'context');
  assert.deepEqual(pay.facts, { listing: '', index: '', sector: '', size: '', checked: true });
  assert.equal(word.facts, null);
  assert.equal(word.basis, 'knowledge');
  assert.equal(validateDetected({ terms: [{ term: '삼성생명', tier: 'company', meaning: '코스피 상장', basis: 'data' }] })[0].basis, 'data');
});

test('dictionary words are still marked in text whose symbols grow when normalized', () => {
  const dom = page('<p>주식 사들이는 호반…대한항공 주가</p>');
  const marks = collectPageMarks({ left: 0, top: 0, right: 400, bottom: 40 }, GLOSSARY, [], dom.window.document.body);
  assert.deepEqual(marks.map((mark) => [mark.id, mark.range.toString()]), [['stock', '주식'], ['current_price', '주가']]);
});
test('normalized expansion, fullwidth and surrogate pairs preserve original mark ranges', () => {
  const dom = page('<p>…😀 주식 … … ＡＢＣ ＰＥＲ 주가</p>');
  const marks = collectPageMarks({ left: 0, top: 0, right: 600, bottom: 40 }, GLOSSARY, [], dom.window.document.body);
  assert.deepEqual(marks.map(mark => mark.range.toString()), ['주식', 'ＰＥＲ', '주가']);
});
test('excluded elements are skipped, limit is respected and dictionary wins overlaps', () => {
  const dom = page('<p>주식 주식 주식</p><textarea>주식</textarea><input value="주식"><div aria-hidden="true"><p>주식</p></div><div data-ocr-widget><p>주식</p></div>');
  const area = { left: 0, top: 0, right: 600, bottom: 200 };
  const marks = collectPageMarks(area, GLOSSARY, [{ term: '주식', tier: 'invest' }], dom.window.document.body, 2);
  assert.equal(marks.length, 2);
  assert.ok(marks.every(mark => mark.id === 'stock' && !mark.ai));
  assert.equal(collectPageMarks(area, GLOSSARY, [], dom.window.document.body).length, 3);
});
test('invalid company metadata is safely normalized', () => {
  const rows = validateDetected({ terms: [
    { term: '가짜', tier: 'company', meaning: '설명', basis: 'wrong', size: 'wrong', listing: '가'.repeat(21), index: '나'.repeat(31), sector: '다'.repeat(21), symbol_code: '../000' },
    { term: '나쁜', tier: 'wrong', meaning: '설명' },
  ] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].basis, 'knowledge');
  assert.equal(rows[0].code, null);
  assert.deepEqual(rows[0].facts, { listing: '', index: '', sector: '', size: '', checked: false });
});
test('broken capture is discarded and unknown page terms do not survive', () => {
  const storage = memory();
  writeLast('owner', { at: 1, source: 'page', text: '주식', pageTerms: ['stock', 'missing'], tab: 'invest', terms: [],
    capture: { kind: 'region', path: '/', area: { left: 0 }, scrollX: 0, scrollY: 0 } }, storage);
  assert.equal(readLast('other', GLOSSARY, storage), null);
  assert.equal(readLast('owner', GLOSSARY, storage).capture, null);
  assert.deepEqual(readLast('owner', GLOSSARY, storage).pageTerms, ['stock']);
});

test('the analyzer stays off until it is turned on in My page', async () => {
  const { readEnabled, ENABLED_KEY } = await import('../src/features/ocr/useTermAnalyzerSetting.js');
  const store = (value) => ({ getItem: (key) => (key === ENABLED_KEY ? value : null) });
  assert.equal(readEnabled(store(null)), false);
  assert.equal(readEnabled(store('false')), false);
  assert.equal(readEnabled(store('true')), true);
  assert.equal(readEnabled({ getItem: () => { throw new Error('blocked'); } }), false);
});

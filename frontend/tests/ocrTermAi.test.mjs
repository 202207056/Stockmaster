import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { GLOSSARY } from '../src/constants/glossary.js';
import { exactGlossaryId, validateTermRequest, validateTermResponse, privacyIssue } from '../src/features/ocr/termAiContract.js';

const payload = () => ({ term: { text: '듀레이션', glossaryId: null }, context: '채권 가격의 금리 민감도를 설명하는 화면이에요.', contextReviewed: true });
const response = () => ({ requestId: 'test-only', source: 'gemini', cached: false, status: 'explained', definition: '모의 정의', simpleExplanation: '모의 쉬운 설명', contextExplanation: '모의 문맥 설명', example: '모의 예시', cautions: '모의 주의사항', message: '' });
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { createTermExplainer } = await server.ssrLoadModule('/src/features/ocr/termAiApi.js');

test('known aliases resolve locally without calling AI', () => {
  for (const [text, id] of [['매수', 'buy'], ['Trading', 'trading'], ['PER', 'per'], ['평단가', 'avg_price']]) assert.equal(exactGlossaryId(text, GLOSSARY), id);
  assert.equal(exactGlossaryId('듀레이션', GLOSSARY), null);
  for (const [id, entry] of Object.entries(GLOSSARY)) assert.equal(exactGlossaryId(entry.term, GLOSSARY), id);
});
test('request contains only the selected word, reviewed minimal context and optional glossary ID', () => {
  assert.equal(validateTermRequest(payload()).term.glossaryId, null);
  for (const extra of ['ocrText', 'image', 'token', 'definition', 'model']) assert.throws(() => validateTermRequest({ ...payload(), [extra]: 'must-not-send' }));
  assert.throws(() => validateTermRequest({ ...payload(), contextReviewed: false }));
  assert.throws(() => validateTermRequest({ ...payload(), context: '가'.repeat(241) }));
  assert.throws(() => validateTermRequest({ ...payload(), term: { text: '가'.repeat(61), glossaryId: null } }));
});
test('privacy screening rejects account numbers, amounts, contacts, names and credentials', () => {
  for (const text of ['123-456-7890', '전화 010 1234 5678', '보유금액 50만원', '보유수량 10', '성명: 홍길동', '홍길동님', 'a@example.com', 'Bearer fake-secret', 'API_KEY=fake', '１２３４５６７８９０']) {
    assert.equal(privacyIssue(text), true, text);
    assert.throws(() => validateTermRequest({ ...payload(), context: text }));
  }
  for (const text of ['예수금', '보유수량', 'PER 12.3', '금리가 오를 때 채권 가격의 변화']) assert.equal(privacyIssue(text), false, text);
});
test('five-section JSON and unsupported-term status are strict; malformed content is rejected', () => {
  assert.equal(validateTermResponse(response()).status, 'explained');
  for (const patch of [{ source: 'mock' }, { cached: 'false' }, { definition: null }, { definition: '' }, { unexpected: 'x' }, { status: 'guaranteed_profit' }]) assert.throws(() => validateTermResponse({ ...response(), ...patch }));
  const unsupported = { ...response(), status: 'not_financial', definition: '', simpleExplanation: '', contextExplanation: '', example: '', cautions: '', message: '금융 용어인지 확인할 수 없어요.' };
  assert.equal(validateTermResponse(unsupported).status, 'not_financial');
  assert.throws(() => validateTermResponse({ ...unsupported, definition: 'invented meaning' }));
});
test('disabled or unauthenticated requests cannot call the transport', async () => {
  let calls = 0;
  for (const [enabled, token] of [[false, 'test'], [true, null]]) {
    await assert.rejects(createTermExplainer({ enabled, token: () => token, post: () => { calls++; } })(payload()));
  }
  assert.equal(calls, 0);
});
test('explicit request uses the team route and a timeout without image, OCR text or credentials in JSON', async () => {
  let request;
  const explain = createTermExplainer({ enabled: true, token: () => 'test-token', post: async (...args) => { request = args; return { data: response() }; } });
  assert.equal((await explain(payload(), new AbortController().signal)).status, 'explained');
  assert.equal(request[0], '/ai/term-explanations'); assert.equal(request[2].timeout, 15000);
  assert.deepEqual(request[1], payload()); assert.ok(!JSON.stringify(request[1]).includes('test-token'));
});
test('HTTP rate, unavailable, invalid response and timeout errors are safely translated', async () => {
  for (const [status, expected] of [[429, /사용량 제한/], [503, /잠시/], [502, /안전하게/], [504, /시간/], [401, /로그인/], [404, /준비/]]) {
    const explain = createTermExplainer({ enabled: true, token: () => 'test', post: async () => { throw { response: { status, data: { detail: 'private-upstream-data' } } }; } });
    await assert.rejects(explain(payload()), expected);
  }
  const explain = createTermExplainer({ enabled: true, token: () => 'test', post: async () => ({ data: { invalid: true } }) });
  await assert.rejects(explain(payload()), /형식/);
});
test('cancelled and stale-session responses are never returned as a fresh explanation', async () => {
  const controller = new AbortController();
  const cancel = createTermExplainer({ enabled: true, token: () => 'test', post: async () => { controller.abort(); return { data: response() }; } });
  await assert.rejects(cancel(payload(), controller.signal));
  let token = 'old';
  const stale = createTermExplainer({ enabled: true, token: () => token, post: async () => { token = 'new'; return { data: response() }; } });
  await assert.rejects(stale(payload()), /로그인 상태/);
});

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  CustomEvent: dom.window.CustomEvent, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: Composer } = await server.ssrLoadModule('/src/components/community/PostComposer.jsx');
const { default: Attachments } = await server.ssrLoadModule('/src/components/community/PostAttachments.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const dataApi = await server.ssrLoadModule('/src/api/data.js');
const { default: Community } = await server.ssrLoadModule('/src/pages/Community.jsx');
const h = React.createElement;
const button = label => [...document.querySelectorAll('button')].find(el => el.textContent === label || el.getAttribute('aria-label') === label);
async function click(label) { assert(button(label), label); await React.act(async () => button(label).click()); }
async function fill(label, value) {
  await React.act(async () => {
    const input = document.querySelector(`[aria-label="${label}"]`);
    const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

test('composer selects attachments, preserves draft on failure and sends verified trade ID', async () => {
  client.setToken('community-test');
  let payload; let saved; let fail = true;
  client.default.defaults.adapter = async config => {
    let data;
    if (config.method === 'post') {
      payload = JSON.parse(config.data);
      if (fail) throw new Error('Temporary failure');
      data = { post_id: 42 };
    } else if (config.url === '/community/capabilities') data = { attachments: true, quotes: true };
    else if (config.url === '/stocks') data = [{ symbol_code: '005930', name: '삼성전자' }];
    else if (config.url === '/trading/orders') data = [
      { order_id: 1, symbol_code: '005930', order_type: '매수', status: '체결', price: 70000, quantity: 2 },
      { order_id: 2, symbol_code: 'PENDING', order_type: '매수', status: '대기', price: 1, quantity: 1 },
    ];
    else throw new Error(`Unexpected ${config.url}`);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(AuthContext.Provider, { value: { isAuthenticated: true, user: { user_id: 1 }, accountId: 1, accounts: [{ account_id: 1, account_name: 'Mock' }] } }, h(Composer, { onSaved: id => { saved = id; } }))));
    await fill('글 제목', '투자 이야기'); await fill('글 내용', '오늘의 생각');
    await click('투표'); await fill('투표 질문', '전망은?'); await fill('선택지 1', '상승'); await fill('선택지 2', '하락');
    await click('+ 선택지 추가'); await fill('선택지 3', '보합'); await click('선택지 3 삭제');
    await click('종목 태그'); await fill('종목명 또는 코드', '삼성'); await click('검색'); await click('삼성전자 005930');
    await click('거래내역'); assert(!document.body.textContent.includes('PENDING'));
    const tradeButton = [...document.querySelectorAll('button')].find(el => el.textContent.includes('모의투자 거래내역'));
    await React.act(async () => tradeButton.click());
    // Exercise the real photo picker path with browser decoding/canvas mocked in JSDOM.
    globalThis.createImageBitmap = async () => ({ width: 800, height: 600, close() {} });
    dom.window.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, drawImage() {} });
    dom.window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,/9j/';
    const input = document.querySelector('input[type=file]');
    Object.defineProperty(input, 'files', { configurable: true, value: [new dom.window.File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] });
    await React.act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    assert(document.querySelector('img[alt="첨부 예정 사진 1"]'));
    await click('게시글 등록');
    assert.equal(saved, undefined);
    assert.equal(document.querySelector('[aria-label="글 제목"]').value, '투자 이야기');
    assert.equal(payload.trade_id, 1);
    assert.equal(payload.symbol_code, '005930');
    assert.deepEqual(payload.poll.options, ['상승', '하락']);
    assert.equal(payload.images.length, 1);
    assert.equal(payload.trade, undefined);
    await click('사진 1 삭제'); assert(!document.querySelector('img'));
    fail = false; await click('게시글 등록'); assert.equal(saved, 42);
  } finally { await React.act(async () => root.unmount()); }
});

test('poll submits selection, refreshes results and photos open in a dialog', async () => {
  let calls = 0; let changed = 0;
  client.default.defaults.adapter = async config => {
    assert.equal(config.url, '/community/posts/10/vote');
    assert.deepEqual(JSON.parse(config.data), { option_index: 1 }); calls++;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  const post = { post_id: 10, attachments: { images: ['data:image/png;base64,aGVsbG8='], poll: { question: '전망?', options: ['상승', '하락'], counts: [1, 0], total: 1, selected: null } } };
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(Attachments, { post, onChanged: () => changed++ })));
    await React.act(async () => document.querySelectorAll('fieldset button')[1].click());
    assert.equal(calls, 1); assert.equal(changed, 1);
    await click('첨부 사진 1 크게 보기'); assert(document.querySelector('dialog').open);
    await click('닫기'); assert(!document.querySelector('dialog').open);
    await React.act(async () => root.render(h(Attachments, { post, authenticated: false, onChanged: () => changed++ })));
    assert(document.querySelector('fieldset').disabled);
  } finally { await React.act(async () => root.unmount()); }
});

test('old list API hydrates body and attachments; unsupported server never silently drops attachments', async () => {
  client.clearRequestCache();
  const calls = [];
  client.default.defaults.adapter = async config => {
    calls.push(config.url);
    if (config.url === '/community/capabilities') throw Object.assign(new Error('Not found'), { response: { status: 404 }, config });
    let data;
    if (config.url === '/community/posts') data = { items: [{ post_id: 8, title: 'old list', like_count: 2 }], total: 1 };
    else if (config.url === '/community/posts/8') data = { post_id: 8, content: 'full body', symbol_code: '005930', attachments: { images: ['photo'] } };
    else if (config.url === '/stocks/005930') data = { symbol_code: '005930', name: '삼성전자' };
    else throw new Error(`Unexpected ${config.url}`);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const result = await dataApi.fetchPosts(1);
  assert.equal(result.items[0].content, 'full body');
  assert.deepEqual(result.items[0].attachments.images, ['photo']);
  assert.equal(result.items[0].attachments.symbol_name, '삼성전자');
  await assert.rejects(dataApi.createPost({ title: 'T', content: 'C', images: ['photo'] }), /서버 업데이트/);
  assert.equal(calls.filter(url => url === '/community/posts').length, 1, 'no create request sent to incompatible server');
});

test('category selection filters server results, prefills tags, shows attachments and all four actions', async () => {
  client.setToken('category-test');
  localStorage.setItem('community:categories:1', JSON.stringify([{ symbol_code: '005930', name: '삼성전자' }]));
  const photo = 'data:image/png;base64,aGVsbG8=';
  const first = { post_id: 1, title: '삼성 게시글', content: '삼성 본문', symbol_code: '005930', author_name: '작성자', like_count: 2, comment_count: 0, attachments: { images: [photo], symbol_name: '삼성전자', poll: { question: '전망?', options: ['상승', '하락'], counts: [1, 0], total: 1, selected: null } } };
  const second = { post_id: 2, title: '다른 게시글', content: '본문', symbol_code: '000660', author_name: '다른 사람', attachments: {} };
  const filters = [];
  client.default.defaults.adapter = async config => {
    let data;
    if (config.url === '/community/posts') { const code = config.params.symbol_code; filters.push(code); const items = code ? [first] : [first, second]; data = { items, total: items.length }; }
    else if (config.url === '/stocks') data = [{ symbol_code: '000660', name: 'SK하이닉스' }];
    else throw new Error(`Unexpected ${config.url}`);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(h(AuthContext.Provider, { value: { user: { user_id: 1, user_name: '나' }, isAuthenticated: true, accountId: 1, accounts: [] } }, h(MemoryRouter, null, h(Community)))));
    assert.equal(document.querySelectorAll('article').length, 2);
    await click('삼성전자');
    assert.equal(filters.at(-1), '005930');
    assert.equal(document.querySelectorAll('article').length, 1);
    assert(document.querySelector('article img'));
    assert(document.querySelector('article fieldset'));
    assert.equal(document.querySelectorAll('.community-actions button svg').length, 4);
    const writer = document.querySelector('section[aria-label="내 글쓰기"] button');
    await React.act(async () => writer.click());
    assert(document.querySelector('form').textContent.includes('#삼성전자'));
    await click('글쓰기 닫기');
    await click('리포스트 인용하기');
    assert(document.querySelector('form a[href="/community?post=1"]'));
    await click('글쓰기 닫기');
    await click('게시글 공유');
    assert(document.querySelector('dialog[aria-label="게시글 공유 링크"]').open);
    await click('닫기');
    await click('카테고리 추가'); await fill('카테고리 종목 검색', '하이닉스'); await click('카테고리 검색');
    await click('SK하이닉스000660');
    assert.equal(JSON.parse(localStorage.getItem('community:categories:1')).length, 2);
    await click('SK하이닉스 카테고리 삭제');
    assert.equal(JSON.parse(localStorage.getItem('community:categories:1')).length, 1);
  } finally { await React.act(async () => root.unmount()); }
});

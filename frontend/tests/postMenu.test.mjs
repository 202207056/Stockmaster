import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: PostMenu } = await server.ssrLoadModule('/src/components/community/PostMenu.jsx');
const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js');
const client = await server.ssrLoadModule('/src/api/client.js');
const button = label => [...document.querySelectorAll('button')].find(el => el.textContent === label || el.getAttribute('aria-label') === label);
const click = async label => { assert(button(label), label); await React.act(async () => button(label).click()); };
const post = { post_id: 1, user_id: 1, title: 'Original', content: 'Body' };
test('owner can edit, retry failure, cancel deletion, and confirm deletion', async () => {
  client.setToken('test-post-menu');
  let fail = true; let changed = 0; let deleted = 0; const requests = [];
  client.default.defaults.adapter = async config => {
    if (config.url === '/community/capabilities') return { data: { edit_attachments: true }, status: 200, statusText: 'OK', headers: {}, config };
    requests.push({ method: config.method, data: config.data && JSON.parse(config.data) });
    if (fail) throw Error('offline');
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: { user_id: 1 } } }, React.createElement(PostMenu, { post, authenticated: true, onChanged: () => changed++, onDeleted: () => deleted++ }))));
    await click('게시글 더보기'); await click('수정');
    const input = document.querySelector('[name="title"]');
    assert.equal(input.value, 'Original');
    input.value = ' Edited ';
    const submit = () => React.act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await submit();
    assert(document.querySelector('[role="alert"]'));
    assert.equal(input.value, ' Edited ');
    fail = false; await submit();
    assert.equal(changed, 1);
    assert.deepEqual(requests.at(-1), { method: 'put', data: { title: 'Edited', content: 'Body', images: [], poll: null, symbol_code: null } });
    await click('게시글 더보기'); await click('삭제'); await click('취소');
    assert.equal(requests.filter(r => r.method === 'delete').length, 0);
    await click('게시글 더보기'); await click('삭제'); await submit();
    assert.equal(deleted, 1);
    assert.equal(requests.at(-1).method, 'delete');
  } finally { await React.act(async () => root.unmount()); }
});
test('other authors only expose sharing and Escape closes the menu', async () => {
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: { user_id: 2 } } }, React.createElement(PostMenu, { post, authenticated: true }))));
    await click('게시글 더보기');
    assert(!button('수정')); assert(!button('삭제')); assert(button('공유'));
    await React.act(async () => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' })));
    assert.equal(button('게시글 더보기').getAttribute('aria-expanded'), 'false');
  } finally { await React.act(async () => root.unmount()); }
});

test('edit composer loads attachments, preserves legacy trade and removes attachments explicitly', async () => {
  const original = { ...post, symbol_code: '005930', attachments: {
    images: ['data:image/png;base64,test'], symbol_name: '삼성전자',
    poll: { question: '전망?', options: ['상승', '하락'], counts: [2, 1], total: 3 },
    trade: { name: '삼성전자', order_type: '매수', quantity: 3, price: 70000 },
  } };
  const writes = [];
  client.default.defaults.adapter = async config => {
    if (config.method === 'put') writes.push(JSON.parse(config.data));
    return { data: config.method === 'get' ? { edit_attachments: true } : { post_id: 1 }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(AuthContext.Provider, { value: { user: { user_id: 1 }, accounts: [] } }, React.createElement(PostMenu, { post: original, authenticated: true, onChanged: () => {} }))));
    await click('게시글 더보기'); await click('수정');
    assert.equal(document.querySelector('[aria-label="투표 질문"]').value, '전망?');
    assert(button('사진 1 삭제')); assert(button('거래내역 삭제')); assert(button('종목 태그 삭제'));
    const title = document.querySelector('[name="title"]');
    assert.equal(title.required, false);
    title.value = '';
    const submit = () => React.act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await submit();
    assert(!Object.hasOwn(writes[0], 'trade_id'));
    assert.equal(writes[0].title, '');
    assert.deepEqual(writes[0].poll, { question: '전망?', options: ['상승', '하락'] });
    assert.deepEqual(writes[0].images, original.attachments.images);
    await click('게시글 더보기'); await click('수정');
    await click('사진 1 삭제'); await click('투표 삭제'); await click('거래내역 삭제'); await click('종목 태그 삭제');
    assert.equal(document.querySelector('[name="title"]').required, true);
    await submit();
    assert.deepEqual(writes[1], { title: 'Original', content: 'Body', images: [], poll: null, trade_id: null, symbol_code: null });
  } finally { await React.act(async () => root.unmount()); }
});

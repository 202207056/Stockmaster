import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readVisiblePageText } from '../src/features/ocr/pageText.js';
import { findDetectedTerms } from '../src/features/ocr/terms.js';
import { GLOSSARY, GLOSSARY_COUNT } from '../src/constants/glossary.js';

function read(html) {
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  // jsdom has no layout. Real scrolling/clipping is tested separately in Edge.
  dom.window.Range.prototype.getClientRects = () => [{ left: 10, top: 10, right: 30, bottom: 30, width: 20, height: 20 }];
  try { return readVisiblePageText(dom.window.document.body); }
  finally { dom.window.close(); }
}

test('DOM analysis reuses the expanded 101-term glossary and local matcher', () => {
  assert.equal(GLOSSARY_COUNT, 176);
  assert.deepEqual(findDetectedTerms(read('<p>매수 매도 트레이딩 Trading PER</p>'), GLOSSARY), ['buy', 'sell', 'trading', 'per']);
});
test('panel, controls, editable values, scripts, templates and media text are excluded', () => {
  const text = read(`<p>매수</p><div data-ocr-widget><p>ETF</p></div><div class="ocr-widget">IPO</div>
    <input value="PBR"><input type="password" value="ROE"><textarea>EPS</textarea><select><option>BPS</option></select>
    <div contenteditable="true"><span>공매도</span></div><script>배당금</script><style>.fixture { --term: 리밸런싱; }</style>
    <template>증거금</template><canvas>손절</canvas><iframe>익절</iframe>`);
  assert.equal(text, '매수');
});
test('hidden and accessibility-only content do not become discovered terms', () => {
  const text = read(`<p>매도</p><p hidden>ETF</p><div aria-hidden="true"><b>IPO</b></div><div inert>PER</div>
    <p style="display:none">PBR</p><p style="visibility:hidden">ROE</p><p style="opacity:0">EPS</p>
    <span class="sr-only">거래량</span><span class="visually-hidden">현재가</span>`);
  assert.equal(text, '매도');
});
test('inline compound terms and word boundaries survive DOM traversal', () => {
  const text = read('<p><span>시장가</span> 주문 · <span>평가</span><span>손익</span></p><p><span>SU</span><span>PER</span></p>');
  assert.deepEqual(findDetectedTerms(text, GLOSSARY), ['market_order', 'eval_pnl']);
});
test('whole-line duplicates are removed without removing distinct values or joining blocks', () => {
  const text = read('<p>PER 12</p><p>PER   12</p><p>PER 20</p><div>시가</div><div>총액</div>');
  assert.equal(text, 'PER 12\nPER 20\n시가\n총액');
  assert.deepEqual(findDetectedTerms(text, GLOSSARY), ['per', 'open_price']);
});
test('general sentences preserve their context rather than exposing isolated ambiguous words', () => {
  assert.deepEqual(findDetectedTerms(read('<p>기온 <span>상승</span></p><p>커피 <span>주문</span></p>'), GLOSSARY), []);
});

test('offscreen rendered text is included at top, middle and bottom without scrolling', () => {
  const dom = new JSDOM('<p>매수</p><p>시드머니</p><p>영업이익</p>', { pretendToBeVisual: true });
  try {
    let calls = 0;
    dom.window.scrollTo = () => { calls++; };
    dom.window.scrollBy = () => { calls++; };
    dom.window.HTMLElement.prototype.scrollIntoView = () => { calls++; };
    dom.window.Range.prototype.getClientRects = () => { throw new Error('Full page text must not depend on viewport rectangles'); };
    for (const y of [0, 1600, 3200]) {
      Object.defineProperty(dom.window, 'scrollY', { value: y, configurable: true });
      assert.deepEqual(findDetectedTerms(readVisiblePageText(dom.window.document.body), GLOSSARY), ['buy', 'seed_money', 'operating_profit']);
      assert.equal(dom.window.scrollY, y);
    }
    assert.equal(calls, 0);
  } finally { dom.window.close(); }
});

test('closed menus, details, dialogs, popovers and inactive tab panels stay excluded', () => {
  const text = read(`<p>매수</p><nav hidden>PER</nav><button role="tab" aria-selected="false" aria-controls="">메뉴</button>
    <details><summary>매도</summary>ETF<p>PBR</p></details>
    <details open><summary>원금</summary><p>시드머니</p></details>
    <dialog>ROE</dialog><dialog open>EPS</dialog><div popover>IPO</div>
    <button role="tab" aria-selected="false" aria-controls="inactive">차트</button>
    <div role="tabpanel" id="inactive">공매도</div>
    <button role="tab" id="other-tab" aria-selected="false">손절</button>
    <div role="tabpanel" aria-labelledby="other-tab">익절</div>
    <div role="tabpanel" data-state="inactive">거래량</div>
    <button role="tab" aria-selected="true" aria-controls="active">호가</button>
    <div role="tabpanel" id="active">체결가</div>`);
  assert.deepEqual(findDetectedTerms(text, GLOSSARY), ['buy', 'sell', 'principal', 'seed_money', 'eps', 'order_book', 'execution_price']);
});

test('all loaded scroll-container text is included and DOM removal / loading refresh the snapshot', () => {
  const dom = new JSDOM('<div style="height:20px;overflow-y:auto"><p>매수</p><p>매도</p></div><p id="row">영업이익</p><template><p>ETF</p></template>', { pretendToBeVisual: true });
  try {
    assert.deepEqual(findDetectedTerms(readVisiblePageText(dom.window.document.body), GLOSSARY), ['buy', 'sell', 'operating_profit']);
    dom.window.document.getElementById('row').remove();
    assert.deepEqual(findDetectedTerms(readVisiblePageText(dom.window.document.body), GLOSSARY), ['buy', 'sell']);
    dom.window.document.body.insertAdjacentHTML('beforeend', '<p>결제일</p>');
    assert.deepEqual(findDetectedTerms(readVisiblePageText(dom.window.document.body), GLOSSARY), ['buy', 'sell', 'settlement_date']);
  } finally { dom.window.close(); }
});

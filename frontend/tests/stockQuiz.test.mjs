import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { STOCK_QUIZ_STAGES, stockQuizKey } from '../src/constants/stockQuiz.js';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/learn' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(async () => { await server.close(); dom.window.close(); });
const { default: StockQuiz } = await server.ssrLoadModule('/src/components/learn/StockQuiz.jsx');
const { getLearningStore, createLearningStore } = await server.ssrLoadModule('/src/utils/learningStore.js');

test('five stages mix OX and multiple choice with unique, valid answers and explanations', () => {
  assert.equal(STOCK_QUIZ_STAGES.length, 5);
  const ids = new Set();
  for (const stage of STOCK_QUIZ_STAGES) {
    assert.equal(stage.questions.length, 4);
    assert.equal(stage.questions.filter(q => q.type === 'ox').length, 2);
    assert.equal(stage.questions.filter(q => q.type === 'choice').length, 2);
    for (const q of stage.questions) {
      assert(!ids.has(q.id)); ids.add(q.id);
      assert.equal(q.options.length, q.type === 'ox' ? 2 : 4);
      assert.equal(new Set(q.options).size, q.options.length);
      assert(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
      assert(q.explanation.length > 30);
    }
  }
});

test('answer, retry, preserve first score, complete stage, navigate and restore saved progress', async () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  const scope = 'quiz-flow-test';
  const store = getLearningStore(scope);
  const click = async node => { assert(node); await React.act(async () => node.click()); };
  const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/learn?tab=quiz&stage=basics'] }, React.createElement(StockQuiz, { scope }))));
    assert.equal(button('정답 확인').disabled, true);
    assert.equal(button('다음 문제 →').disabled, true);
    await click(container.querySelectorAll('input')[1]);
    await click(button('정답 확인'));
    assert.match(container.querySelector('.quiz-feedback').textContent, /괜찮아요/);
    await click(button('이 문제 다시 풀기'));
    await click(container.querySelectorAll('input')[0]);
    await click(button('정답 확인'));
    const first = store.getSnapshot().records[stockQuizKey('basics-1')];
    assert.equal(first.correct, true);
    assert.equal(first.firstCorrect, false);
    assert.equal(first.attempts, 2);
    for (const q of STOCK_QUIZ_STAGES[0].questions.slice(1)) {
      await click(button('다음 문제 →'));
      await click(container.querySelectorAll('input')[q.correct]);
      await click(button('정답 확인'));
    }
    assert.match(container.querySelector('.quiz-result').textContent, /첫 풀이 3 \/ 4 정답 · 현재 4 \/ 4 정답/);
    const restored = createLearningStore(scope);
    assert.equal(restored.getSnapshot().records[stockQuizKey('basics-1')].firstCorrect, false);
    assert.equal(createLearningStore('another-user').getSnapshot().records[stockQuizKey('basics-1')], undefined);
    await click(button('다음 단계: 주문과 거래 이해 →'));
    assert.equal(container.querySelector('h3').textContent, '주문과 거래 이해');
    assert.equal(container.querySelectorAll('input').length, 2);
    await click(button('← 전체 단계 보기'));
    assert.equal(container.querySelectorAll('.quiz-stage-card').length, 5);
    assert.match(container.textContent, /4 \/ 20문항/);
    await React.act(async () => store.clear());
    assert.match(container.textContent, /0 \/ 20문항/);
  } finally { await React.act(async () => root.unmount()); }
});

test('invalid stage falls back to overview; revisiting starts at first unanswered question', async () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  const store = getLearningStore('quiz-resume-test');
  store.write(stockQuizKey('returns-1'), { selected: 0, answered: true, correct: true, firstCorrect: true, attempts: 1 });
  try {
    await React.act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/learn?tab=quiz&stage=invalid'] }, React.createElement(StockQuiz, { scope: 'quiz-resume-test' }))));
    assert.equal(container.querySelectorAll('.quiz-stage-card').length, 5);
    await React.act(async () => container.querySelectorAll('.quiz-stage-card')[2].click());
    assert.match(container.querySelector('legend').textContent, /10만원/);
    assert.equal(container.querySelectorAll('input').length, 4);
    await React.act(async () => store.clear());
    assert.equal(buttonDisabled(), true);
    function buttonDisabled() { return [...container.querySelectorAll('button')].find(node => node.textContent === '정답 확인').disabled; }
  } finally { await React.act(async () => root.unmount()); }
});

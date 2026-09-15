import test from 'node:test';
import assert from 'node:assert/strict';
import { compareAllocation, partialSale, learningScope, safeRecord, recordAnswer, EMPTY_ANSWER } from '../src/utils/learning.js';
import { createLearningStore, decodeLearning } from '../src/utils/learningStore.js';
import { COURSES, LESSONS, CONTEXT_QUESTIONS } from '../src/constants/learningContent.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('allocation compares account changes, including cash-only, full investment and flat prices', () => {
  assert.equal(compareAllocation(80, -10).delta, -80000);
  assert.equal(compareAllocation(20, -10).total, 980000);
  assert.equal(compareAllocation(0, -30).delta, 0);
  assert.equal(compareAllocation(100, 30).total, 1300000);
  assert.equal(compareAllocation(80, 0).rate, 0);
  assert.equal(compareAllocation(-1, 10), null);
  assert.equal(compareAllocation(101, 10), null);
  assert.equal(compareAllocation(NaN, 10), null);
});

test('partial sales preserve equity and separate realized from remaining unrealized loss', () => {
  for (const qty of [0, 10, 20, 30]) {
    const result = partialSale(qty);
    assert.equal(result.total, 970000);
    assert.equal(result.cash + result.market, result.total);
    assert.equal(result.realized + result.unrealized, -30000);
    assert.equal(result.remaining, 30 - qty);
  }
  assert.equal(partialSale(10).realized, -10000);
  assert.equal(partialSale(10).unrealized, -20000);
  assert.equal(partialSale(31), null);
  assert.equal(partialSale(-1), null);
  assert.equal(partialSale(0).remaining, 30); // No sale, not an execution.
});

test('first attempt is not overwritten by a successful retry', () => {
  const first = recordAnswer(EMPTY_ANSWER, 1, 0);
  const second = recordAnswer(first, 0, 0);
  assert.equal(second.correct, true);
  assert.equal(second.firstCorrect, false);
  assert.equal(second.attempts, 2);
});

test('learning and notebooks are partitioned across users and accounts and survive reload', () => {
  const storage = memoryStorage();
  const factory = (user, account) => createLearningStore(learningScope(user, account), () => storage);
  const first = factory(1, 10);
  first.write('plan:X', { reason: 'Only account 10' });
  assert.equal(factory(1, 10).read('plan:X', { reason: '' }).reason, 'Only account 10');
  for (const store of [factory(1, 11), factory(2, 10), factory(null), factory(1)]) assert.equal(store.read('plan:X', { reason: '' }).reason, '');
  first.remove('plan:X');
  assert.equal(factory(1, 10).read('plan:X', { reason: '' }).reason, '');
});

test('blocked storage keeps the session working and reports failure honestly', () => {
  const store = createLearningStore('blocked', () => ({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } }));
  assert.equal(store.getSnapshot().persistent, false);
  assert.equal(store.write('scenario', { reason: 'retained in memory' }), false);
  assert.equal(store.read('scenario', { reason: '' }).reason, 'retained in memory');
  assert.match(store.getSnapshot().notice, /이번 방문/);
  store.clear();
  assert.match(store.getSnapshot().notice, /삭제하지 못/);
});

test('corrupted or incompatible storage is rejected; malformed fields use safe defaults', () => {
  assert.throws(() => decodeLearning('{broken'));
  assert.throws(() => decodeLearning(JSON.stringify({ version: 99, records: {} })));
  assert.throws(() => decodeLearning(JSON.stringify({ version: 1, records: [] })));
  assert.deepEqual(safeRecord({ reason: {}, stage: '4', revisions: [null, 'bad', { reason: 'ok' }] }, { reason: '', stage: 0, revisions: [] }), { reason: '', stage: 0, revisions: [{ reason: 'ok' }] });
});

test('all 15 lessons have valid, distinct questions and context links resolve', () => {
  assert.equal(COURSES.length, 5);
  assert.equal(LESSONS.length, 15);
  const questions = [...CONTEXT_QUESTIONS, ...LESSONS.flatMap((lesson) => lesson.questions)];
  assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
  for (const lesson of LESSONS) {
    assert(COURSES.some((course) => course.id === lesson.course));
    assert.equal(lesson.questions.length, 2);
    assert(lesson.situation && lesson.action && lesson.outcome && lesson.activity);
  }
  for (const question of questions) {
    assert(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < question.options.length);
    assert(question.explanation.length > 10);
    if (question.lessonId) assert(LESSONS.some((lesson) => lesson.id === question.lessonId));
  }
});

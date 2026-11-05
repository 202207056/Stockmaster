import test from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY } from '../src/constants/glossary.js';
import { exactGlossaryId } from '../src/components/ai/term-analyzer/terms.js';
import { addHistory, MAX_HISTORY, readHistory, removeHistory } from '../src/components/ai/term-analyzer/searchHistory.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), data };
}
const aiTerm = (term, extra = {}) => ({ term, tier: 'invest', meaning: `${term}의 뜻이에요.`, basic: false, code: null, basis: 'knowledge', facts: null, ...extra });

test('a searched word that is in the dictionary needs no AI call', () => {
  for (const id of Object.keys(GLOSSARY)) assert.equal(exactGlossaryId(GLOSSARY[id].term, GLOSSARY), id);
  assert.equal(exactGlossaryId(' 매수 ', GLOSSARY), 'buy');
  assert.equal(exactGlossaryId('per', GLOSSARY), 'per');
  assert.equal(exactGlossaryId('듀레이션', GLOSSARY), null);
  assert.equal(exactGlossaryId('', GLOSSARY), null);
});

test('search history keeps the newest first, moves repeats up and drops the oldest', () => {
  const storage = memoryStorage();
  let list = [];
  for (let i = 0; i < MAX_HISTORY + 3; i += 1) list = addHistory('7', list, { term: `낱말${i}`, kind: 'ai', detail: aiTerm(`낱말${i}`), at: i }, storage);
  assert.equal(list.length, MAX_HISTORY);
  assert.equal(list[0].term, `낱말${MAX_HISTORY + 2}`);
  assert.ok(!list.some((item) => item.term === '낱말0'));
  list = addHistory('7', list, { term: '낱말10', kind: 'ai', detail: aiTerm('낱말10'), at: 99 }, storage);
  assert.equal(list[0].term, '낱말10');
  assert.equal(list.filter((item) => item.term === '낱말10').length, 1);
  list = removeHistory('7', list, '낱말10', storage);
  assert.ok(!list.some((item) => item.term === '낱말10'));
  assert.deepEqual(readHistory('7', GLOSSARY, storage), list);
  assert.deepEqual(readHistory('8', GLOSSARY, storage), []);
});

test('saved history comes back as the same cards and bad entries are skipped', () => {
  const storage = memoryStorage();
  const company = aiTerm('깨끗한나라', { tier: 'company', code: '004540', basis: 'data',
    facts: { listing: '코스피', index: '', sector: '제지', size: '중견', group: '', parent: '', checked: true } });
  addHistory('guest', [{ term: '매수', kind: 'dictionary', id: 'buy', at: 1 }], { term: company.term, kind: 'ai', detail: company, at: 2 }, storage);
  const [first, second] = readHistory('guest', GLOSSARY, storage);
  assert.deepEqual(first, { term: '깨끗한나라', kind: 'ai', detail: company, at: 2 });
  assert.deepEqual(second, { term: '매수', kind: 'dictionary', id: 'buy', at: 1 });
  storage.setItem('stockmaster:term-search-history:guest', JSON.stringify([{ term: '없는말', kind: 'dictionary', id: 'nope', at: 1 },
    { term: 'x', kind: 'ai', detail: { term: 'x' }, at: 1 }, { term: '', kind: 'ai', at: 1 }, 'bad']));
  assert.deepEqual(readHistory('guest', GLOSSARY, storage), []);
  storage.setItem('stockmaster:term-search-history:guest', '{broken');
  assert.deepEqual(readHistory('guest', GLOSSARY, storage), []);
});

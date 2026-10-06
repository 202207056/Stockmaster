import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as favorites from '../src/utils/favorites.js';

let storage;
beforeEach(() => {
  storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.window = new EventTarget();
  favorites.setFavoritesOwner(null);
});

test('recent stocks are deduplicated, newest first, capped at ten and independent of favorites', () => {
  for (let i = 0; i < 12; i++) favorites.recordRecentStock(String(i));
  assert.deepEqual(favorites.getRecentStocks(), ['11', '10', '9', '8', '7', '6', '5', '4', '3', '2']);
  favorites.recordRecentStock('5');
  assert.deepEqual(favorites.getRecentStocks(), ['5', '11', '10', '9', '8', '7', '6', '4', '3', '2']);
  assert.deepEqual(favorites.getFavorites(), []);
  favorites.clearRecentStocks();
  assert.deepEqual(favorites.getRecentStocks(), []);
});

test('legacy favorites survive groups, multiple memberships and group deletion', () => {
  storage.set('gp_favorites', '["OLD"]');
  const first = favorites.createFavoriteGroup('반도체');
  const second = favorites.createFavoriteGroup('장기 투자');
  favorites.saveFavoriteGroups('NEW', [first.id, second.id]);
  assert.deepEqual(favorites.getFavorites(), ['OLD', 'NEW']);
  assert(favorites.getFavoriteGroups().every(group => group.codes.includes('NEW')));
  favorites.saveFavoriteGroups('NEW', [second.id]);
  assert.deepEqual(favorites.getFavoriteGroups()[0].codes, []);
  favorites.renameFavoriteGroup(second.id, '장기');
  assert.equal(favorites.getFavoriteGroups()[1].name, '장기');
  favorites.deleteFavoriteGroup(second.id);
  assert.deepEqual(favorites.getFavorites(), ['OLD', 'NEW']);
  favorites.saveFavoriteGroups('NEW', []);
  assert.deepEqual(favorites.getFavorites(), ['OLD', 'NEW']);
});

test('removing favorites cleans group membership but preserves recent history and group names', () => {
  const group = favorites.createFavoriteGroup('그룹');
  favorites.saveFavoriteGroups('A', [group.id]);
  favorites.saveFavoriteGroups('B', [group.id]);
  favorites.recordRecentStock('A');
  favorites.removeFavorite('A');
  assert.deepEqual(favorites.getFavoriteGroups()[0].codes, ['B']);
  favorites.clearFavorites();
  assert.deepEqual(favorites.getFavoriteGroups()[0].codes, []);
  assert.deepEqual(favorites.getRecentStocks(), ['A']);
});

test('groups and recent stocks are isolated between users and guests', () => {
  const group = favorites.createFavoriteGroup('게스트');
  favorites.saveFavoriteGroups('GUEST', [group.id]);
  favorites.recordRecentStock('GUEST');
  favorites.setFavoritesOwner(1);
  assert.deepEqual(favorites.getFavoriteGroups(), []);
  assert.deepEqual(favorites.getRecentStocks(), []);
  favorites.createFavoriteGroup('개인');
  favorites.recordRecentStock('USER');
  favorites.setFavoritesOwner(2);
  assert.deepEqual(favorites.getFavoriteGroups(), []);
  assert.deepEqual(favorites.getRecentStocks(), []);
  favorites.setFavoritesOwner(null);
  assert.equal(favorites.getFavoriteGroups()[0].name, '게스트');
  assert.deepEqual(favorites.getRecentStocks(), ['GUEST']);
});

test('group names reject blank, duplicate and overlong input', () => {
  const group = favorites.createFavoriteGroup(' 반도체 ');
  assert.equal(group.name, '반도체');
  for (const name of [' ', '반도체', 'a'.repeat(31)]) assert.throws(() => favorites.createFavoriteGroup(name));
  favorites.renameFavoriteGroup(group.id, '반도체');
});

test('malformed storage is ignored and mutations notify same-tab subscribers', () => {
  storage.set('gp_favorites:groups', '[null,{}, {"id":1}]');
  storage.set('gp_favorites:recent', 'broken');
  assert.deepEqual(favorites.getFavoriteGroups(), []);
  assert.deepEqual(favorites.getRecentStocks(), []);
  let changes = 0;
  window.addEventListener(favorites.FAVORITES_EVENT, () => changes++);
  favorites.createFavoriteGroup('테스트');
  favorites.recordRecentStock('A');
  assert.equal(changes, 2);
});

test('storage failure is reported for explicit changes and does not break stock browsing', () => {
  localStorage.setItem = () => { throw new Error('quota exceeded'); };
  assert.throws(() => favorites.createFavoriteGroup('그룹'));
  assert.throws(() => favorites.saveFavoriteGroups('A', []));
  assert.doesNotThrow(() => favorites.recordRecentStock('A'));
});

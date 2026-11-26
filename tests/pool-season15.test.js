import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SEASON, seasonPool, handEntries} from '../public/season.js';
import {REMOVED_BY_ID} from '../public/removals.js';
import {ALREADY_REMOVED, REMOVED_MINIONS} from '../public/season15/removed.js';
import {CHANGED_MINIONS, NEW_MINIONS, RETURNING_CHANGED_MINIONS, RETURNING_MINIONS} from '../public/season15/minions.js';
import {NEW_SPELLS, REMOVED_SPELLS, RETURNING_CHANGED_SPELLS, RETURNING_SPELLS} from '../public/season15/spells.js';

const catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
const pool = seasonPool(catalog);
const byName = (cards, name) => cards.find(c => c.name === name);
const ids = cards => new Set(cards.map(c => c.id));

test('SEASON exposes the patch facts and counts computed from the data (REPORT-7 section 2)', () => {
  assert.deepEqual({...SEASON, counts: undefined}, {number: 15, name: 'Warped Empire', patch: '37.2', launch: '2026-12-01', notes: {url: 'https://hearthstone.blizzard.com/en-us/news/24316976', read: '2026-11-25', preview: true}, counts: undefined});
  assert.deepEqual(SEASON.counts, {removed: 108, added: 66, returning: 42, changed: 24});
  assert.equal(RETURNING_MINIONS.length, 23);
  assert.equal(RETURNING_CHANGED_MINIONS.length, 19);
});

test('removals: all 107 catalog ids leave the pool; Expert Aviator is a no-op already gone from the catalog', () => {
  assert.equal(REMOVED_MINIONS.length, 107);
  const present = ids(pool.minions);
  for (const [id, name] of REMOVED_MINIONS) {
    assert.ok(catalog.minions.some(c => c.id === id), `${name} (${id}) must exist in the pinned catalog`);
    assert.ok(!present.has(id), `${name} must not be in the pool`);
    assert.ok(REMOVED_BY_ID.has(id), `${name} must have a removal note`);
  }
  assert.deepEqual(ALREADY_REMOVED.map(([id]) => id), ['BG34_140']);
  assert.ok(!catalog.minions.some(c => c.id === 'BG34_140') && !present.has('BG34_140'));
});

test('minions are applied in order: returning, new, then changes; the pool has no duplicate ids', () => {
  const present = ids(pool.minions);
  assert.equal(present.size, pool.minions.length);
  for (const card of [...RETURNING_MINIONS, ...RETURNING_CHANGED_MINIONS, ...NEW_MINIONS]) assert.ok(present.has(card.id), card.name);
  assert.equal(NEW_MINIONS.length, 66);
  assert.ok(NEW_MINIONS.every(c => /^S15_[a-z0-9_]+$/.test(c.id) && c.tier >= 1 && c.tier <= 6 && c.attack > 0 && c.health > 0));
  const base = catalog.minions.filter(c => !REMOVED_BY_ID.has(c.id)).length;
  assert.equal(pool.minions.length, base + NEW_MINIONS.length + SEASON.counts.returning);
  const handOnly = pool.minions.filter(c => c.handEntered && !CHANGED_MINIONS.some(x => x.id === c.id));
  assert.ok(handOnly.every(c => c.patch === '37.2 (preview notes)'));
  assert.equal(byName(pool.minions, 'Alleycat').id, 'BG_CFM_315');
  assert.deepEqual(byName(pool.minions, 'Loti, Devilsaur Form').types, ['BEAST']);
});

test('changes override the catalog entry and keep the old-to-new string', () => {
  const mystic = byName(pool.minions, 'Shoalfin Mystic');
  assert.deepEqual([mystic.tier, mystic.attack, mystic.health, mystic.handEntered], [2, 3, 3, true]);
  assert.match(mystic.change, /\[Tier 3\] 4\/4\. -> \[Tier 2\] 3\/3\./);
  const goldrinn = byName(pool.minions, 'Goldrinn, the Great Wolf');
  assert.deepEqual([goldrinn.tier, goldrinn.attack, goldrinn.health], [6, 5, 5]);
  assert.match(goldrinn.description, /\+5\/\+5/);
  const macaw = byName(pool.minions, 'Monstrous Macaw');
  assert.deepEqual([macaw.tier, macaw.attack, macaw.health], [3, 4, 3]);
  assert.equal(CHANGED_MINIONS.filter(c => c.tokenOnly).length, 2);
  assert.ok(!byName(pool.minions, "C'Thun"));
});

test('Murcules stays in the pool marked disputed; Emerald Proto-Whelp is hand-entered and flagged', () => {
  assert.match(byName(pool.minions, 'Murcules').disputed, /hsbg\.cards lists it as removed/);
  const whelp = byName(pool.minions, 'Emerald Proto-Whelp');
  assert.equal(whelp.handEntered, true);
  assert.match(whelp.flag, /No HearthstoneJSON match/);
  assert.deepEqual([whelp.attack, whelp.health], [0, 3]);
  assert.equal(pool.minions.filter(c => c.disputed || c.flag).length, 2);
});

test('Tavern spells: 9 removed, 2 returning, 2 returning with changes, 9 new', () => {
  assert.deepEqual([REMOVED_SPELLS.length, RETURNING_SPELLS.length, RETURNING_CHANGED_SPELLS.length, NEW_SPELLS.length], [9, 2, 2, 9]);
  assert.equal(catalog.spells.length, 76);
  assert.equal(pool.spells.length, 76 - 9 + 2 + 2 + 9);
  const names = new Set(pool.spells.map(c => c.name));
  for (const [, name] of REMOVED_SPELLS) assert.ok(!names.has(name), name);
  for (const name of ['Deepwater Clan', 'Pointy Arrow', 'Dragonstorm', 'Command the Elements']) assert.ok(names.has(name), name);
  const roar = byName(pool.spells, 'Echoing Roar');
  assert.deepEqual([roar.cost, roar.tier, roar.spell], [2, 3, true]);
  assert.match(roar.description, /\+3\/\+3/);
  const sanctify = byName(pool.spells, 'Sanctify');
  assert.deepEqual([sanctify.tier, sanctify.description], [4, 'Give your minions with Divine Shield +4 Attack.']);
  assert.ok(pool.spells.every(c => c.spell === true && Array.isArray(c.types) && Number.isInteger(c.tier) && Number.isInteger(c.cost)));
  const unholy = byName(pool.spells, 'Unholy Ritual');
  assert.deepEqual([unholy.cost, unholy.tier], [1, 3]);
});

test('every hand entry is labelled with its source and listed for the update summary', () => {
  const entries = handEntries();
  assert.equal(entries.length, 66 + 42 + 13 + 22);
  assert.ok([...pool.minions, ...pool.spells].filter(c => c.handEntered).every(c => c.patch === '37.2 (preview notes)'));
  assert.ok(entries.every(e => e.id && e.name && ['insert', 'override'].includes(e.kind)));
});

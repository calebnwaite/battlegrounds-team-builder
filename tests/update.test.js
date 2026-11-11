import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildCatalog, diffCatalogs, sha256, staleOverrides} from '../scripts/lib/catalog.js';
import {resolveLatestBuild, runUpdate} from '../scripts/lib/update.js';

const minion = (id, extra = {}) => ({id, name: id, text: 'Text', type: 'MINION', isBattlegroundsPoolMinion: true, techLevel: 1, races: ['BEAST'], ...extra});
const trinket = (id, extra = {}) => ({id, name: id, text: '', type: 'BATTLEGROUND_TRINKET', spellSchool: 'LESSER_TRINKET', cost: 3, ...extra});
const oldCards = [minion('A'), minion('B'), minion('C'), trinket('T1'), trinket('T2', {spellSchool: 'GREATER_TRINKET'})];
const newCards = [
  minion('A'), // unchanged
  minion('B', {techLevel: 2, text: '<b>New</b> text'}), // changed tier and text
  // C removed
  minion('D'), trinket('T1', {cost: 4}), trinket('T3'), // added minion, changed cost, added trinket
  trinket('T2', {spellSchool: 'GREATER_TRINKET'}),
  // BG-only filtering: none of these may reach the catalog
  {id: 'HS_1', name: 'Hearthstone card', type: 'MINION', techLevel: 3},
  minion('A_G', {battlegroundsNormalDbfId: 5}),
  {id: 'SPELL_1', type: 'SPELL', isBattlegroundsPoolMinion: true},
  trinket('BG30_Trinket_1st'), trinket('BG30_Trinket_2nd'), trinket('X', {spellSchool: 'ARCANE'}),
];

test('buildCatalog keeps only the Battlegrounds pool and normalizes markup', () => {
  const catalog = buildCatalog(newCards);
  assert.deepEqual(catalog.minions.map(c => c.id), ['A', 'B', 'D']);
  assert.deepEqual(catalog.trinkets.map(c => c.id), ['T1', 'T3', 'T2']);
  assert.equal(catalog.minions[1].description, 'New text');
  assert.equal(catalog.trinkets[2].kind, 'Greater');
});

test('diffCatalogs reports added, removed and changed cards with the changed fields', () => {
  const diff = diffCatalogs(buildCatalog(oldCards), buildCatalog(newCards));
  assert.deepEqual(diff.added.map(e => e.card.id), ['D', 'T3']);
  assert.deepEqual(diff.removed.map(e => e.card.id), ['C']);
  assert.deepEqual(diff.changed.map(e => [e.card.id, e.fields]), [['B', ['tier', 'description']], ['T1', ['cost']]]);
  const none = diffCatalogs(buildCatalog(oldCards), buildCatalog(oldCards));
  assert.deepEqual([none.added, none.removed, none.changed], [[], [], []]);
});

test('staleOverrides lists override ids missing from the catalog', () => {
  assert.deepEqual(staleOverrides(buildCatalog(newCards), ['A', 'GONE', 'T3']), ['GONE']);
});

const indexHtml = build => `<a href="/v1/${build}/">x</a><a href="/v1/${build - 1}/">y</a>`;
function fakeFetch(latest, cards) {
  const body = Buffer.from(JSON.stringify(cards));
  const calls = [];
  const impl = async url => {
    calls.push(url);
    if (url.endsWith('/latest/')) return new Response(indexHtml(latest));
    if (url.endsWith(`/v1/${latest}/enUS/cards.json`)) return new Response(body, {headers: {'last-modified': 'Tue, 03 Nov 2026 17:22:53 GMT'}});
    return new Response('nope', {status: 404});
  };
  return {impl, calls, body};
}

function makeRoot(pinnedBuild = 100) {
  const root = mkdtempSync(path.join(tmpdir(), 'bg-update-test-'));
  mkdirSync(path.join(root, 'public'));
  const raw = Buffer.from(JSON.stringify(oldCards));
  writeFileSync(path.join(root, 'public', 'catalog.json'), JSON.stringify(buildCatalog(oldCards)));
  writeFileSync(path.join(root, 'public', 'build.json'), JSON.stringify({build: pinnedBuild, url: 'u', sha256: sha256(raw), lastModified: '2026-10-13', retrieved: '2026-10-27'}));
  writeFileSync(path.join(root, 'public', 'removals.js'), '// manual overrides must never be touched\n');
  return root;
}
const quiet = {log() {}, warn() {}};
const read = (root, name) => readFileSync(path.join(root, 'public', name), 'utf8');

test('resolveLatestBuild reads the newest build from the latest index and fails clearly otherwise', async () => {
  assert.equal(await resolveLatestBuild(fakeFetch(300, []).impl), 300);
  await assert.rejects(resolveLatestBuild(async () => new Response('<html></html>')), /build number/);
  await assert.rejects(resolveLatestBuild(async () => new Response('x', {status: 503})), /HTTP 503/);
  await assert.rejects(resolveLatestBuild(async () => { throw new Error('offline'); }), /offline/);
});

test('no change: nothing is downloaded or written when the pinned build is current', async () => {
  const root = makeRoot(300);
  const before = read(root, 'catalog.json');
  const {impl, calls} = fakeFetch(300, newCards);
  const result = await runUpdate({root, fetchImpl: impl, ...quiet});
  assert.equal(result.changed, false);
  assert.equal(calls.length, 1);
  assert.equal(read(root, 'catalog.json'), before);
});

test('--check reports the diff but writes nothing', async () => {
  const root = makeRoot();
  const before = read(root, 'catalog.json');
  const summaryPath = path.join(root, 'summary.md');
  const result = await runUpdate({root, check: true, summaryPath, fetchImpl: fakeFetch(300, newCards).impl, ...quiet});
  assert.equal(result.changed, true);
  assert.equal(result.written, false);
  assert.equal(read(root, 'catalog.json'), before);
  assert.equal(existsSync(summaryPath), false);
  assert.equal(JSON.parse(read(root, 'build.json')).build, 100);
});

test('update writes catalog, pin from the real download and markdown summary; overrides are untouched; stale overrides warn', async () => {
  const root = makeRoot();
  const summaryPath = path.join(root, 'summary.md');
  const warnings = [];
  const fetched = fakeFetch(300, newCards);
  const result = await runUpdate({root, summaryPath, fetchImpl: fetched.impl, removedIds: ['C', 'A'], now: new Date('2026-11-11T12:00:00Z'), log() {}, warn: m => warnings.push(m)});
  assert.equal(result.written, true);
  assert.deepEqual(JSON.parse(read(root, 'build.json')), {build: 300, url: 'https://api.hearthstonejson.com/v1/300/enUS/cards.json', sha256: sha256(fetched.body), lastModified: '2026-11-03', retrieved: '2026-11-11'});
  assert.deepEqual(JSON.parse(read(root, 'catalog.json')), buildCatalog(newCards));
  const summary = readFileSync(summaryPath, 'utf8');
  assert.match(summary, /build 100 to 300/);
  assert.match(summary, /\*\*2\*\* added, \*\*1\*\* removed, \*\*2\*\* changed/);
  assert.match(summary, /B \(B\): tier 1 -> 2/);
  assert.match(summary, /removals\.js ids no longer in the catalog[\s\S]*- C/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /\bC\b/);
  assert.equal(read(root, 'removals.js'), '// manual overrides must never be touched\n');
});

test('an empty or non-Battlegrounds download is refused and leaves files alone', async () => {
  const root = makeRoot();
  const before = read(root, 'catalog.json');
  await assert.rejects(runUpdate({root, fetchImpl: fakeFetch(300, [minion('Z', {isBattlegroundsPoolMinion: false})]).impl, ...quiet}), /refusing to update/);
  assert.equal(read(root, 'catalog.json'), before);
});

test('a failed download surfaces the HTTP status', async () => {
  const root = makeRoot();
  const impl = async url => url.endsWith('/latest/') ? new Response(indexHtml(300)) : new Response('', {status: 500});
  await assert.rejects(runUpdate({root, fetchImpl: impl, ...quiet}), /HTTP 500/);
});

test('the committed pin has a SHA256 and the catalog is non-empty', () => {
  const info = JSON.parse(readFileSync(new URL('../public/build.json', import.meta.url), 'utf8'));
  assert.match(info.sha256, /^[0-9a-f]{64}$/);
  assert.ok(Number.isInteger(info.build));
  const catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
  assert.ok(catalog.minions.length > 0 && catalog.trinkets.length > 0);
});

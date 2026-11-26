import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from '../scripts/lib/args.js';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, existsSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildCatalog, diffCatalogs, sha256, staleOverrides} from '../scripts/lib/catalog.js';
import {resolveLatestBuild, runUpdate} from '../scripts/lib/update.js';
import {handEntries, seasonPool} from '../public/season.js';
import {REMOVED_BY_ID} from '../public/removals.js';
import {REMOVED_MINIONS} from '../public/season15/removed.js';

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

test('parseArgs accepts the documented flags and rejects anything else (a dry run must never write)', () => {
  assert.deepEqual(parseArgs([]), {check: false, summary: null});
  assert.deepEqual(parseArgs(['--check', '--summary', 'out.md']), {check: true, summary: 'out.md'});
  for (const bad of [['--check;'], ['--chek'], ['check'], ['--check', 'extra'], ['--summary'], ['--summary', '--check']]) assert.throws(() => parseArgs(bad), /Unknown argument|needs a file path/, bad.join(' '));
});

test('update.js exits non-zero with usage on an unknown argument, before touching the network or files', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/update.js', import.meta.url)), '--check;'], {encoding: 'utf8'});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown argument: "--check;"[\s\S]*Usage:/);
});

// Season 15 guard: hand-entered preview-notes data must survive any HearthstoneJSON update.
const realCatalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
const asRaw = catalog => [
  ...catalog.minions.map(c => minion(c.id, {name: c.name, text: c.description, techLevel: c.tier, races: c.types, isBattlegroundsDuosExclusive: c.duos})),
  ...catalog.trinkets.map(c => trinket(c.id, {name: c.name, text: c.description, spellSchool: c.kind === 'Lesser' ? 'LESSER_TRINKET' : 'GREATER_TRINKET', cost: c.cost, races: c.types})),
  ...catalog.spells.map(c => ({id: c.id, name: c.name, text: c.description, type: 'BATTLEGROUND_SPELL', isBattlegroundsPoolSpell: true, techLevel: c.tier, cost: c.cost, isBattlegroundsDuosExclusive: c.duos})),
];
function makeRealRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'bg-s15-test-'));
  mkdirSync(path.join(root, 'public'));
  writeFileSync(path.join(root, 'public', 'catalog.json'), JSON.stringify(realCatalog));
  writeFileSync(path.join(root, 'public', 'build.json'), JSON.stringify({build: 100, url: 'u', sha256: 'x', lastModified: '2026-10-13', retrieved: '2026-10-27'}));
  return root;
}
const seasonSourceFiles = ['season.js', 'removals.js', ...readdirSync(new URL('../public/season15/', import.meta.url)).map(f => `season15/${f}`)];
const seasonSources = () => seasonSourceFiles.map(f => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8'));
const handCards = pool => [...pool.minions, ...pool.spells].filter(c => c.handEntered);

test('a download of older HearthstoneJSON data cannot change hand-entered Season 15 cards or the pool membership', async () => {
  const sourcesBefore = seasonSources();
  const beforePool = seasonPool(realCatalog);
  // An "older" build: pre-Season 15 values (the committed catalog) plus one unrelated new card.
  const raw = [...asRaw(realCatalog), minion('BG_SOMETHING_NEW', {name: 'Something New'})];
  const root = makeRealRoot();
  const result = await runUpdate({root, fetchImpl: fakeFetch(101, raw).impl, handEntries: handEntries(), removedIds: REMOVED_BY_ID.keys(), now: new Date('2026-11-30T00:00:00Z'), ...quiet});
  assert.equal(result.written, true);
  const afterCatalog = JSON.parse(read(root, 'catalog.json'));
  assert.ok(afterCatalog.minions.some(c => c.id === 'BG_SOMETHING_NEW'));
  const afterPool = seasonPool(afterCatalog);
  assert.deepEqual(handCards(afterPool), handCards(beforePool));
  assert.deepEqual(afterPool.minions.map(c => c.id).sort(), [...beforePool.minions.map(c => c.id), 'BG_SOMETHING_NEW'].sort());
  assert.deepEqual(afterPool.spells, beforePool.spells);
  for (const [id] of REMOVED_MINIONS) assert.ok(!afterPool.minions.some(c => c.id === id), id);
  assert.deepEqual(seasonSources(), sourcesBefore, 'the update must never edit the Season 15 data files');
  assert.deepEqual(readdirSync(path.join(root, 'public')).sort(), ['build.json', 'catalog.json']);
});

test('older data that re-adds a changed card cannot undo the hand-entered change', () => {
  const stale = {...realCatalog, minions: realCatalog.minions.map(c => c.name === 'Shoalfin Mystic' ? {...c, tier: 3} : c)};
  const mystic = seasonPool(stale).minions.find(c => c.name === 'Shoalfin Mystic');
  assert.deepEqual([mystic.tier, mystic.attack, mystic.health], [2, 3, 3]);
});

test('hand entries that a newer build now has are listed for retirement, matched by id or name; hand data stays in force', async () => {
  const raw = asRaw(realCatalog);
  raw.push(minion('BG_CFM_315', {name: 'Alleycat'})); // returning minion: matched by id
  raw.push(minion('BG99_001', {name: 'Erupting Eyestalk'})); // new minion: matched by name, different id
  const mystic = realCatalog.minions.find(c => c.name === 'Shoalfin Mystic');
  raw.splice(raw.findIndex(c => c.id === mystic.id), 1, minion(mystic.id, {name: mystic.name, techLevel: 2, text: mystic.description, races: mystic.types})); // override now matches
  const summaryPath = path.join(makeRealRoot(), 'summary.md');
  const root = makeRealRoot();
  await runUpdate({root, summaryPath, fetchImpl: fakeFetch(101, raw).impl, handEntries: handEntries(), ...quiet});
  const summary = readFileSync(summaryPath, 'utf8');
  assert.match(summary, /### Hand-entered Season 15 cards now in HearthstoneJSON/);
  for (const name of ['Alleycat', 'Erupting Eyestalk', 'Shoalfin Mystic']) assert.match(summary, new RegExp(String.raw`- ${name} \([^)]+\): now in HearthstoneJSON: replace the hand entry`));
  assert.doesNotMatch(summary, /- Zoatroid/);
  assert.doesNotMatch(summary, /- Dragonstorm/);
  const pool = seasonPool(JSON.parse(read(root, 'catalog.json')));
  assert.deepEqual(pool.minions.filter(c => c.name === 'Erupting Eyestalk').map(c => c.id), ['S15_erupting_eyestalk']);
  assert.equal(pool.minions.filter(c => c.name === 'Alleycat').length, 1);
});

test('with nothing to retire the summary has no hand-entry section', async () => {
  const summaryPath = path.join(makeRealRoot(), 'summary.md');
  await runUpdate({root: makeRealRoot(), summaryPath, fetchImpl: fakeFetch(101, asRaw(realCatalog)).impl, handEntries: handEntries(), ...quiet});
  assert.doesNotMatch(readFileSync(summaryPath, 'utf8'), /now in HearthstoneJSON/);
});

test('catalog extraction takes only pool Tavern spells and the diff reports spell changes', () => {
  const cards = [minion('A'), trinket('T1'), {id: 'SP1', name: 'Pool Spell', text: '<b>Do</b> it', type: 'BATTLEGROUND_SPELL', isBattlegroundsPoolSpell: true, techLevel: 2, cost: 1}, {id: 'SP2', name: 'Not Pool', type: 'BATTLEGROUND_SPELL', isBattlegroundsPoolSpell: false, techLevel: 1, cost: 1}];
  const catalog = buildCatalog(cards);
  assert.deepEqual(catalog.spells, [{id: 'SP1', name: 'Pool Spell', description: 'Do it', types: [], tier: 2, cost: 1, spell: true, duos: false}]);
  const diff = diffCatalogs(catalog, {...catalog, spells: [{...catalog.spells[0], tier: 3}]});
  assert.deepEqual(diff.changed.map(e => [e.section, e.card.id, e.fields]), [['spells', 'SP1', ['tier']]]);
});

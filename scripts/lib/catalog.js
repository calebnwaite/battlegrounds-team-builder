import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {plainText} from '../../public/model.js';

/** @typedef {import('../../public/model.js').Card} Card */
/** @typedef {{minions: Card[], trinkets: Card[]}} Catalog */
/** @typedef {{build: number, url: string, sha256: string, lastModified: string, retrieved: string}} BuildInfo */

export const API_ROOT = 'https://api.hearthstonejson.com/v1/';
export const TRINKET_PLACEHOLDERS = ['BG30_Trinket_1st', 'BG30_Trinket_2nd'];
const COMPARED_FIELDS = ['name', 'tier', 'types', 'description', 'cost', 'kind', 'duos'];

export const sha256 = (/** @type {Buffer} */ raw) => createHash('sha256').update(raw).digest('hex');
export const buildUrl = (/** @type {number} */ build) => `${API_ROOT}${build}/enUS/cards.json`;

/** Battlegrounds-only extraction: pool minions without golden variants, Lesser/Greater trinkets without shop placeholders.
 * @param {any[]} cards @returns {Catalog} */
export function buildCatalog(cards) {
  const minions = cards.filter(c => c.type === 'MINION' && c.isBattlegroundsPoolMinion && !c.battlegroundsNormalDbfId);
  const trinkets = cards.filter(c => c.type === 'BATTLEGROUND_TRINKET' && ['LESSER_TRINKET', 'GREATER_TRINKET'].includes(c.spellSchool) && !TRINKET_PLACEHOLDERS.includes(c.id));
  const clean = c => ({id: c.id, name: c.name, description: plainText(c.text), types: c.races ?? (c.race ? [c.race] : []), ...(c.type === 'MINION' ? {tier: c.techLevel, duos: Boolean(c.isBattlegroundsDuosExclusive)} : {kind: c.spellSchool === 'LESSER_TRINKET' ? 'Lesser' : 'Greater', cost: c.cost ?? null})});
  return {minions: minions.map(clean), trinkets: trinkets.map(clean)};
}

export const readJson = (/** @type {string | URL} */ file) => JSON.parse(readFileSync(file, 'utf8'));
export const writeCatalog = (/** @type {string | URL} */ file, /** @type {Catalog} */ catalog) => writeFileSync(file, JSON.stringify(catalog));
export const writeBuildInfo = (/** @type {string | URL} */ file, /** @type {BuildInfo} */ info) => writeFileSync(file, JSON.stringify(info, null, 2) + '\n');

/** @param {Catalog} before @param {Catalog} after */
export function diffCatalogs(before, after) {
  const result = {added: [], removed: [], changed: []};
  for (const section of ['minions', 'trinkets']) {
    const old = new Map(before[section].map(c => [c.id, c]));
    const next = new Map(after[section].map(c => [c.id, c]));
    for (const [id, card] of next) {
      if (!old.has(id)) { result.added.push({section, card}); continue; }
      const was = old.get(id);
      const fields = COMPARED_FIELDS.filter(f => JSON.stringify(was[f]) !== JSON.stringify(card[f]));
      if (fields.length) result.changed.push({section, card, was, fields});
    }
    for (const [id, card] of old) if (!next.has(id)) result.removed.push({section, card});
  }
  return result;
}

/** Override ids that no longer exist in the generated catalog.
 * @param {Catalog} catalog @param {Iterable<string>} overrideIds */
export function staleOverrides(catalog, overrideIds) {
  const known = new Set([...catalog.minions, ...catalog.trinkets].map(c => c.id));
  return [...overrideIds].filter(id => !known.has(id));
}

const show = v => Array.isArray(v) ? (v.join(', ') || 'none') : JSON.stringify(v ?? null);
const label = ({card}) => `${card.name} (${card.id})`;

/** Markdown summary used for console output and the pull request body.
 * @param {{from: BuildInfo, to: BuildInfo, diff: ReturnType<typeof diffCatalogs>, stale: string[]}} data */
export function formatSummary({from, to, diff, stale}) {
  const lines = [`## Battlegrounds data update: build ${from.build} to ${to.build}`, '',
    `Source: ${to.url}`, `SHA256: \`${to.sha256}\``, `Last-Modified: ${to.lastModified}; retrieved ${to.retrieved}`, '',
    `Battlegrounds cards only: **${diff.added.length}** added, **${diff.removed.length}** removed, **${diff.changed.length}** changed.`];
  if (diff.added.length) lines.push('', '### Added', ...diff.added.map(e => `- ${label(e)}, ${e.section === 'minions' ? `tier ${e.card.tier}` : e.card.kind}`));
  if (diff.removed.length) lines.push('', '### Removed from the catalog', ...diff.removed.map(e => `- ${label(e)}`));
  if (diff.changed.length) lines.push('', '### Changed', ...diff.changed.map(e => `- ${label(e)}: ${e.fields.map(f => `${f} ${show(e.was[f])} -> ${show(e.card[f])}`).join('; ')}`));
  if (stale.length) lines.push('', '### Warning: removals.js ids no longer in the catalog', ...stale.map(id => `- ${id}`), '', 'Review `public/removals.js`; these entries are kept but have no effect.');
  lines.push('', 'Pool rotation cannot be detected from HearthstoneJSON. `public/removals.js` stays manual: update it from official Blizzard patch notes.');
  return lines.join('\n') + '\n';
}

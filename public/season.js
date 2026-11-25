import {REMOVED_BY_ID} from './removals.js';
import {ALREADY_REMOVED, REMOVED_MINIONS} from './season15/removed.js';
import {CHANGED_MINIONS, NEW_MINIONS, RETURNING_CHANGED_MINIONS, RETURNING_MINIONS} from './season15/minions.js';
import {NEW_SPELLS, RETURNING_CHANGED_SPELLS, RETURNING_SPELLS} from './season15/spells.js';
import {DISPUTED} from './season15/flags.js';
import {PATCH_LABEL, PREVIEW_NOTES, SEASON_LAUNCH, SEASON_NAME, SEASON_NUMBER, SEASON_PATCH} from './season15/sources.js';

/** @typedef {import('./model.js').Card} Card */

const RETURNING_ENTRIES = [...RETURNING_MINIONS, ...RETURNING_CHANGED_MINIONS];
export const SEASON = {
  number: SEASON_NUMBER, name: SEASON_NAME, patch: SEASON_PATCH, launch: SEASON_LAUNCH, notes: PREVIEW_NOTES,
  counts: {
    removed: REMOVED_MINIONS.length + ALREADY_REMOVED.length,
    added: NEW_MINIONS.length,
    returning: RETURNING_ENTRIES.length,
    changed: CHANGED_MINIONS.length,
  },
};

/** Hand data is stamped with its source so the page can say where each card came from. */
const handCard = (/** @type {Card} */ card) => ({...card, handEntered: true, patch: PATCH_LABEL});
const flagged = (/** @type {Card} */ card) => DISPUTED[card.id] ? {...card, disputed: DISPUTED[card.id]} : card;

const without = (/** @type {Record<string, unknown>} */ object, /** @type {string[]} */ keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));

/** Applies a hand override on top of a catalog card (same id); the override always wins. */
function override(/** @type {Card} */ card, /** @type {Record<string, unknown>} */ change) {
  return {...card, ...without(change, ['id', 'name', 'tokenOnly']), handEntered: true, patch: PATCH_LABEL};
}

/** Hand entries replace a catalog card with the same id or name, so a newer HearthstoneJSON build can neither undo nor duplicate them. */
function mergeHand(/** @type {Card[]} */ base, /** @type {Card[]} */ extra) {
  const ids = new Set(extra.map(card => card.id));
  const names = new Set(extra.map(card => card.name));
  return [...base.filter(card => !ids.has(card.id) && !names.has(card.name)), ...extra];
}

/** The Season 15 pool: catalog minus removals, plus returning and new cards, with changes laid over.
 * @param {{minions: Card[], spells?: Card[]}} catalog @returns {{minions: Card[], spells: Card[]}} */
export function seasonPool(catalog) {
  const overrides = new Map(CHANGED_MINIONS.filter(change => !change.tokenOnly).map(change => [change.id, change]));
  const kept = catalog.minions.filter(card => !REMOVED_BY_ID.has(card.id))
    .map(card => overrides.has(card.id) ? override(card, overrides.get(card.id)) : card);
  const minions = mergeHand(kept, [...RETURNING_ENTRIES, ...NEW_MINIONS].map(handCard)).map(flagged);
  const keptSpells = (catalog.spells ?? []).filter(card => !REMOVED_BY_ID.has(card.id));
  const spells = mergeHand(keptSpells, [...RETURNING_SPELLS, ...RETURNING_CHANGED_SPELLS, ...NEW_SPELLS]);
  return {minions, spells};
}

/** Every hand entry, for the update summary: `insert` entries add a card, `override` entries change a catalog card.
 * @returns {{kind: 'insert' | 'override', section: 'minions' | 'spells', id: string, name: string, fields?: Record<string, unknown>}[]} */
export function handEntries() {
  const inserts = [
    ...[...RETURNING_ENTRIES, ...NEW_MINIONS].map(card => ({kind: /** @type {const} */ ('insert'), section: /** @type {const} */ ('minions'), id: card.id, name: card.name})),
    ...[...RETURNING_SPELLS, ...RETURNING_CHANGED_SPELLS, ...NEW_SPELLS].map(card => ({kind: /** @type {const} */ ('insert'), section: /** @type {const} */ ('spells'), id: card.id, name: card.name})),
  ];
  const overrides = CHANGED_MINIONS.filter(change => !change.tokenOnly)
    .map(change => ({kind: /** @type {const} */ ('override'), section: /** @type {const} */ ('minions'), id: change.id, name: change.name, fields: without(change, ['id', 'name', 'tokenOnly', 'change'])}));
  return [...inserts, ...overrides];
}

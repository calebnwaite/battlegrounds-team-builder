/** Hand-entered Season 15 cards that a downloaded HearthstoneJSON catalog now also has.
 * The update never edits hand data; this only tells a person which entries can be retired. */

/** @typedef {import('./catalog.js').Catalog} Catalog */
/** @typedef {ReturnType<typeof import('../../public/season.js').handEntries>[number]} HandEntry */

const squash = (/** @type {unknown} */ text) => String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const COMPARABLE_OVERRIDE_FIELDS = ['tier', 'description'];

/** An inserted card is "in" the catalog by id or name; an override is "in" once the catalog already shows every value it sets.
 * @param {Catalog} catalog @param {HandEntry[]} entries @returns {HandEntry[]} */
export function entriesNowInCatalog(catalog, entries) {
  return entries.filter(entry => {
    const cards = catalog[entry.section] ?? [];
    if (entry.kind === 'insert') return cards.some(card => card.id === entry.id || squash(card.name) === squash(entry.name));
    const card = cards.find(c => c.id === entry.id);
    const compared = COMPARABLE_OVERRIDE_FIELDS.filter(field => entry.fields && field in entry.fields);
    return Boolean(card) && compared.length > 0 && compared.every(field => squash(card[field]) === squash(entry.fields?.[field]));
  });
}

/** Summary lines for the pull request body; empty when nothing can be retired.
 * @param {HandEntry[]} retired */
export function formatRetired(retired) {
  if (!retired.length) return [];
  return ['', '### Hand-entered Season 15 cards now in HearthstoneJSON', '',
    ...retired.map(e => `- ${e.name} (${e.id}): now in HearthstoneJSON: replace the hand entry`), '',
    'Hand data stays in force until a person removes the entry from `public/season15/`; this update never edits it.'];
}

/** @typedef {{id: string, name: string, description: string, types: string[], tier?: number, kind?: string, cost?: number | null, duos?: boolean}} Card */
/** Plain text only; source markup is never interpreted as HTML. */
export function plainText(text = '') {
  return text.replace(/\[x\]/g, '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}
/** @param {Card} card */
export function matches(card, {query = '', tribe = '', tier = '', kind = ''} = {}) {
  return `${card.name} ${card.description}`.toLowerCase().includes(query.trim().toLowerCase())
    && (!tribe || card.types.includes(tribe)) && (!tier || String(card.tier) === tier)
    && (!kind || card.kind === kind);
}
/** @param {(Card | null)[]} slots @param {Card} card */
export function add(slots, card) {
  const index = slots.indexOf(null);
  if (index < 0) return false;
  slots[index] = card;
  return true;
}
export function remove(slots, index) {
  if (!Number.isInteger(index) || index < 0 || index >= slots.length) return false;
  slots[index] = null;
  return true;
}
export function move(slots, index, delta) {
  const target = index + delta;
  if (!Number.isInteger(index) || !slots[index] || Math.abs(delta) !== 1 || target < 0 || target >= slots.length) return false;
  [slots[index], slots[target]] = [slots[target], slots[index]];
  return true;
}
/** Splits a catalog into the default pool by dropping officially removed cards.
 * @param {{minions: Card[], trinkets: Card[]}} catalog @param {Map<string, unknown>} removed */
export function applyRemovals(catalog, removed) {
  const keep = (/** @type {Card[]} */ cards) => cards.filter(card => !removed.has(card.id));
  return {minions: keep(catalog.minions), trinkets: keep(catalog.trinkets)};
}

import {MINOR_CARDS} from './timewarp/minor.js';
import {MAJOR_CARDS} from './timewarp/major.js';
/** @typedef {{id: string, name: string, description: string, stage: 'minor' | 'major', cost: number, tier: number, cardType: 'minion' | 'spell' | 'hero power', types: string[], attack?: number, health?: number, status: 'new' | 'returning' | 'changed', change?: string, patch?: string}} TimewarpCard */
/** Slot order is also the stage order: slot 0 takes a Minor pick, slot 1 a Major pick. */
export const STAGES = /** @type {const} */ (['minor', 'major']);
export const STAGE_INFO = {
  minor: {label: 'Minor Timewarp', turn: 6, tier: 3},
  major: {label: 'Major Timewarp', turn: 9, tier: 5},
};
/** @type {TimewarpCard[]} */
export const TIMEWARP_CARDS = [...MINOR_CARDS, ...MAJOR_CARDS];
/** Search text matches name, description, card type and tribe tags (tags come from hsbg.cards and may differ from real minion types). */
export function matchesTimewarp(card, {query = '', stage = '', cardType = ''} = {}) {
  const haystack = `${card.name} ${card.description} ${card.types.join(' ')}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase()) && (!stage || card.stage === stage) && (!cardType || card.cardType === cardType);
}
/** Puts the card in the slot for its stage. Returns false when that slot is already taken. */
export function addTimewarp(slots, card) {
  const index = STAGES.indexOf(card.stage);
  if (index < 0 || slots[index]) return false;
  slots[index] = card;
  return true;
}
/** Human-readable meta line: stage, tier, Chronum cost, card type and tags. */
export function timewarpMeta(card) {
  const type = card.cardType === 'minion' ? 'Minion' : card.cardType === 'spell' ? 'Tavern spell' : 'Hero Power card';
  const stats = card.attack !== undefined ? ` · ${card.attack}/${card.health}` : '';
  const tags = card.types.length ? ` · Tags: ${card.types.join(' / ')}` : '';
  return `${STAGE_INFO[card.stage].label} · Tier ${card.tier} · ${card.cost} Chronum · ${type}${stats}${tags}`;
}

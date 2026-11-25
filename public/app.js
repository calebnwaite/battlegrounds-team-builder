import {matches, add, remove, move, applyRemovals} from './model.js';
import {REMOVED_BY_ID, removalNote} from './removals.js';
import {TIMEWARP_CARDS, STAGES, STAGE_INFO, matchesTimewarp, addTimewarp, timewarpMeta} from './timewarp.js';
const el = id => document.getElementById(id);
const board = Array(7).fill(null), timewarp = Array(STAGES.length).fill(null);
/** @type {{minions: import('./model.js').Card[]}} */
let catalog;
let active = 'minions';
const announce = text => {el('status').textContent = text;};
/** @template {keyof HTMLElementTagNameMap} T
 * @param {T} tag
 * @param {string} className
 * @param {string} [text]
 * @returns {HTMLElementTagNameMap[T]}
 */
function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}
function button(text, label, action, disabled = false) {
  const b = node('button', '', text);
  b.setAttribute('aria-label', label); b.disabled = disabled;
  b.addEventListener('click', action); return b;
}
const isSynthetic = card => card.id.startsWith('S15_TW_');
function artwork(card) {
  const wrap = node('div', 'art');
  if (isSynthetic(card)) {wrap.classList.add('unavailable'); wrap.append(node('span', 'art-fallback', 'New in Season 15 · art pending')); return wrap;}
  const fallback = node('span', 'art-fallback', '✦');
  const img = document.createElement('img');
  img.alt = ''; img.loading = 'lazy';
  img.addEventListener('error', () => {img.remove(); fallback.textContent = 'Art unavailable'; wrap.classList.add('unavailable');}, {once:true});
  img.src = `https://art.hearthstonejson.com/v1/256x/${encodeURIComponent(card.id)}.jpg`;
  wrap.append(fallback, img); return wrap;
}
function cardContent(card) {
  const body = node('div', 'card-body');
  body.append(node('h3', '', card.name));
  const meta = card.stage ? timewarpMeta(card) : `Tier ${card.tier} · ${card.types.join(' / ') || 'No tribe'}${card.duos ? ' · Duos only' : ''}`;
  body.append(node('div', 'card-meta', meta), node('p', 'description', card.description || 'No description.'));
  if (card.stage) {
    body.append(node('span', `badge ${card.status}`, card.status === 'new' ? 'New' : card.status === 'changed' ? 'Changed' : 'Returning'));
    if (card.change) body.append(node('p', 'removed-flag', `Changed in 37.2: ${card.change}`));
    if (card.patch) body.append(node('div', 'card-meta', `Patch ${card.patch}`));
    return body;
  }
  const removed = removalNote(card);
  if (removed) body.append(node('p', 'removed-flag', removed));
  return body;
}
function moveBoard(index, delta) {
  if (!move(board,index,delta)) {announce('Cannot move beyond the board edge.');return;}
  renderSelections();
  const direction = delta < 0 ? 'left' : 'right';
  const slot = el('board').querySelectorAll('article')[index+delta];
  slot.tabIndex = -1; slot.focus();
  announce(`Minion moved ${direction}.`);
}
function renderSlots(slots, container, type) {
  const isBoard = type === 'board';
  const fragment = document.createDocumentFragment();
  slots.forEach((card, index) => {
    const slot = node('article', `slot ${card ? 'filled' : 'empty'}`);
    slot.setAttribute('aria-label', isBoard ? `Board slot ${index + 1}` : `${STAGE_INFO[STAGES[index]].label} slot`);
    slot.append(node('span', 'slot-number', String(index + 1).padStart(2,'0')));
    if (!card) slot.append(node('div', 'empty-symbol', isBoard ? '+' : '◇'), node('p', '', isBoard ? 'Add a minion' : `Choose a ${STAGES[index]} card (Turn ${STAGE_INFO[STAGES[index]].turn})`));
    else {
      slot.append(artwork(card), cardContent(card));
      const controls = node('div', 'slot-controls');
      if (isBoard) controls.append(button('←', `Move ${card.name} left from slot ${index+1}`, () => moveBoard(index,-1), index === 0), button('→', `Move ${card.name} right from slot ${index+1}`, () => moveBoard(index,1), index === slots.length-1));
      controls.append(button('Remove', `Remove ${card.name} from ${isBoard ? `board slot ${index+1}` : `${STAGE_INFO[STAGES[index]].label} slot`}`, () => {remove(slots,index); renderSelections(); announce(`${card.name} removed.`); el(container).querySelectorAll('article')[index].setAttribute('tabindex','-1'); el(container).querySelectorAll('article')[index].focus();}));
      slot.append(controls);
    }
    fragment.append(slot);
  });
  el(container).replaceChildren(fragment);
}
function renderSelections() {
  renderSlots(board,'board','board'); renderSlots(timewarp,'timewarp-slots','timewarp');
  el('board-count').textContent = `${board.filter(Boolean).length} / 7`;
  el('timewarp-count').textContent = `${timewarp.filter(Boolean).length} / ${STAGES.length}`;
}
const value = id => /** @type {HTMLInputElement} */ (el(id)).value;
function renderPool() {
  if (!catalog) return;
  const isMinions = active === 'minions';
  const pool = isMinions ? catalog.minions : TIMEWARP_CARDS;
  const filtered = isMinions ? pool.filter(c => matches(c, {query:value('query'), tribe:value('tribe'), tier:value('tier')})) : pool.filter(c => matchesTimewarp(/** @type {import('./timewarp.js').TimewarpCard} */ (c), {query:value('query'), stage:value('stage'), cardType:value('card-type')}));
  el('result-count').textContent = isMinions ? `${filtered.length} minions found · ${pool.length} in the catalog minus announced removals` : `${filtered.length} Timewarp cards found · ${pool.length} from the Patch 37.2 preview notes (Chronum costs)`;
  const fragment = document.createDocumentFragment();
  filtered.forEach(card => {
    const article = node('article', 'pool-card');
    article.append(artwork(card), cardContent(card), button('+ Add', `Add ${card.name}`, () => {
      if (isMinions ? !add(board,card) : !addTimewarp(timewarp,card)) {announce(isMinions ? 'Board is full. Remove a piece first.' : `The ${STAGE_INFO[/** @type {import('./timewarp.js').TimewarpCard} */ (card).stage].label} slot is taken. Remove that pick first.`); return;}
      renderSelections(); announce(`${card.name} added.`);
    }));
    fragment.append(article);
  });
  if (!filtered.length) fragment.append(node('p','no-results','No matches. Try a different search or reset your filters.'));
  el('pool').replaceChildren(fragment);
}
el('filters').addEventListener('submit', e => e.preventDefault());
el('filters').addEventListener('input',renderPool);
el('filters').addEventListener('reset', () => {for (const id of ['query','tribe','tier','stage','card-type']) /** @type {HTMLInputElement} */ (el(id)).value = ''; renderPool();});
for (const mode of ['minions','timewarp']) el(mode === 'minions' ? 'minion-tab' : 'timewarp-tab').addEventListener('click', () => {
  active = mode;
  el('minion-tab').setAttribute('aria-pressed',String(mode === 'minions')); el('timewarp-tab').setAttribute('aria-pressed',String(mode === 'timewarp'));
  el('tribe-label').hidden = mode !== 'minions'; el('tier-label').hidden = mode !== 'minions'; el('stage-label').hidden = mode !== 'timewarp'; el('card-type-label').hidden = mode !== 'timewarp'; renderPool();
});
function bindClear(id, slots) {el(id).addEventListener('click', () => {slots.fill(null);renderSelections();announce('Selection cleared.');});}
bindClear('clear-board',board);
bindClear('clear-timewarp',timewarp);
renderSelections();
/** Header badge and footer build line both come from build.json, which the update script rewrites. */
async function showBuildInfo() {
  try {
    const response = await fetch('build.json');
    if (!response.ok) throw new Error(`Build info HTTP ${response.status}`);
    const info = await response.json();
    el('build-badge').textContent = `CATALOG ${info.build} · MINUS REMOVALS`;
    el('build-info').textContent = `${info.build}, retrieved ${info.retrieved}`;
  } catch (error) {console.error('Build info unavailable:',error);}
}
try {
  const response = await fetch('catalog.json');
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  catalog = applyRemovals(await response.json(), REMOVED_BY_ID);
  const types = [...new Set(catalog.minions.flatMap(c => c.types))].sort();
  for (const type of types) {const option = node('option','',type); option.setAttribute('value',String(type)); el('tribe').append(option);}
  for (let tier=1;tier<=7;tier++) {const option=node('option','',`Tier ${tier}`);option.setAttribute('value',String(tier));el('tier').append(option);}
  await showBuildInfo();
  renderPool(); announce('Catalog ready. Add pieces to start building.');
} catch (error) {console.error('Catalog loading failed:',error);announce('Could not load the catalog. Check the server log and reload the page.');}

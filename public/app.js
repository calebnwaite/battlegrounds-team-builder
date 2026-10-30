import {matches, add, remove, move, applyRemovals} from './model.js';
import {REMOVED_BY_ID, removalNote} from './removals.js';
const el = id => document.getElementById(id);
const board = Array(7).fill(null), trinkets = Array(2).fill(null);
/** @type {{minions: import('./model.js').Card[], trinkets: import('./model.js').Card[]}} */
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
function artwork(card) {
  const wrap = node('div', 'art');
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
  const meta = card.kind ? `${card.kind} trinket · Cost ${card.cost ?? 'unknown'}` : `Tier ${card.tier} · ${card.types.join(' / ') || 'No tribe'}${card.duos ? ' · Duos only' : ''}`;
  body.append(node('div', 'card-meta', meta), node('p', 'description', card.description || 'No description.'));
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
    slot.setAttribute('aria-label', `${isBoard ? 'Board' : 'Trinket'} slot ${index + 1}`);
    slot.append(node('span', 'slot-number', String(index + 1).padStart(2,'0')));
    if (!card) slot.append(node('div', 'empty-symbol', isBoard ? '+' : '◇'), node('p', '', isBoard ? 'Add a minion' : 'Choose a trinket'));
    else {
      slot.append(artwork(card), cardContent(card));
      const controls = node('div', 'slot-controls');
      if (isBoard) controls.append(button('←', `Move ${card.name} left from slot ${index+1}`, () => moveBoard(index,-1), index === 0), button('→', `Move ${card.name} right from slot ${index+1}`, () => moveBoard(index,1), index === slots.length-1));
      controls.append(button('Remove', `Remove ${card.name} from ${type} slot ${index+1}`, () => {remove(slots,index); renderSelections(); announce(`${card.name} removed.`); el(container).querySelectorAll('article')[index].setAttribute('tabindex','-1'); el(container).querySelectorAll('article')[index].focus();}));
      slot.append(controls);
    }
    fragment.append(slot);
  });
  el(container).replaceChildren(fragment);
}
function renderSelections() {
  renderSlots(board,'board','board'); renderSlots(trinkets,'trinket-slots','trinket');
  el('board-count').textContent = `${board.filter(Boolean).length} / 7`;
  el('trinket-count').textContent = `${trinkets.filter(Boolean).length} / 2`;
}
const value = id => /** @type {HTMLInputElement} */ (el(id)).value;
function renderPool() {
  if (!catalog) return;
  const filtered = catalog[active].filter(c => matches(c, {query:value('query'), ...(active === 'minions' ? {tribe:value('tribe'),tier:value('tier')} : {kind:value('kind')})}));
  el('result-count').textContent = `${filtered.length} ${active} found · ${catalog[active].length} in the catalog minus announced removals`;
  const fragment = document.createDocumentFragment();
  filtered.forEach(card => {
    const article = node('article', 'pool-card');
    const target = active === 'minions' ? board : trinkets;
    article.append(artwork(card), cardContent(card), button('+ Add', `Add ${card.name}`, () => {
      if (!add(target,card)) {announce(`${active === 'minions' ? 'Board' : 'Trinket selection'} is full. Remove a piece first.`); return;}
      renderSelections(); announce(`${card.name} added.`);
    }));
    fragment.append(article);
  });
  if (!filtered.length) fragment.append(node('p','no-results','No matches. Try a different search or reset your filters.'));
  el('pool').replaceChildren(fragment);
}
el('filters').addEventListener('submit', e => e.preventDefault());
el('filters').addEventListener('input',renderPool);
el('filters').addEventListener('reset', () => {for (const id of ['query','tribe','tier','kind']) /** @type {HTMLInputElement} */ (el(id)).value = ''; renderPool();});
for (const mode of ['minions','trinkets']) el(mode === 'minions' ? 'minion-tab' : 'trinket-tab').addEventListener('click', () => {
  active = mode;
  el('minion-tab').setAttribute('aria-pressed',String(mode === 'minions')); el('trinket-tab').setAttribute('aria-pressed',String(mode === 'trinkets'));
  el('tribe-label').hidden = mode !== 'minions'; el('tier-label').hidden = mode !== 'minions'; el('kind-label').hidden = mode !== 'trinkets'; renderPool();
});
function bindClear(id, slots) {el(id).addEventListener('click', () => {slots.fill(null);renderSelections();announce('Selection cleared.');});}
bindClear('clear-board',board);
bindClear('clear-trinkets',trinkets);
renderSelections();
try {
  const response = await fetch('catalog.json');
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  catalog = applyRemovals(await response.json(), REMOVED_BY_ID);
  const types = [...new Set(catalog.minions.flatMap(c => c.types))].sort();
  for (const type of types) {const option = node('option','',type); option.setAttribute('value',String(type)); el('tribe').append(option);}
  for (let tier=1;tier<=7;tier++) {const option=node('option','',`Tier ${tier}`);option.setAttribute('value',String(tier));el('tier').append(option);}
  renderPool(); announce('Catalog ready. Add pieces to start building.');
} catch (error) {console.error('Catalog loading failed:',error);announce('Could not load the catalog. Check the server log and reload the page.');}

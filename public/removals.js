/**
 * Cards officially announced as removed from the Battlegrounds pool.
 * Applied on top of the pinned catalog (never edited in catalog.json).
 * Each entry: [card id, name]. The group carries the official URL and date.
 * Only announced removals are listed; other changes may be missed.
 */
export const REMOVALS_AS_OF = 'October 30, 2026';
const ABERRATIONS = {
  url: 'https://hearthstone.blizzard.com/en-us/news/24302091/aberrations-join-battlegrounds-at-blizzcon',
  date: 'Announced 2026-09-12, effective 2026-09-22',
};
export const REMOVAL_GROUPS = [
  {...ABERRATIONS, reason: 'Naga rotated out of the minion pool', cards: [
    ['BG23_000','Mini-Myrmidon'],['BG23_002','Shell Collector'],['BG23_004','Deep-Sea Angler'],['BG23_007','Waverider'],
    ['BG23_008','Glowscale'],['BG23_009','Lava Lurker'],['BG26_505','Zesty Shaker'],['BG27_514',"Sea Witch Zar'jira"],
    ['BG31_035','Groundbreaker'],['BG31_330','Ominous Seer'],['BG31_920','Darkcrest Strategist'],['BG31_924','Thaumaturgist'],
    ['BG31_925','Showy Cyclist'],['BG32_820','Firescale Hoarder'],['BG32_835','Tranquil Meditative'],['BG32_837','Fauna Whisperer'],
    ['BG33_319','Rimescale Priestess'],['BG34_925','Seafloor Recruiter'],['BG35_921','Abyssal Bruiser'],['BG36_508','Cagey Conjurer'],
    ['BG36_622','Torrential Ruiner'],['BG36_921','Fleeing Fugitive'],['BGDUO31_209','Private Chef'],['BGDUO_122','Storm Splitter'],
  ]},
  {...ABERRATIONS, reason: 'Listed under Removed Lesser/Greater Trinkets', cards: [
    ['BG30_MagicItem_303','Automaton Portrait'],['BG35_MagicItem_309','Errgl Sticker'],
    ['BG35_MagicItem_821','Kaleidoscope'],['BG35_MagicItem_821t','Kaleidoscope'],
    ['BG35_MagicItem_863','Avalanche Sticker'],['BG36_MagicItem_380','Amplifying Essence'],['BG36_MagicItem_841','Assembler Portrait'],
  ]},
];
/** @type {Map<string, {name: string, reason: string, url: string, date: string}>} */
export const REMOVED_BY_ID = new Map(REMOVAL_GROUPS.flatMap(({cards, ...source}) => cards.map(([id, name]) => [id, {name, ...source}])));
/** Visible warning text for a card that is no longer in the pool, or '' when it still is. */
export function removalNote(card) {
  const removal = REMOVED_BY_ID.get(card.id);
  return removal ? `Removed from the pool: ${removal.reason} (${removal.date})` : '';
}

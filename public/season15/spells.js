// Hand-entered Season 15 Tavern spells (Patch 37.2 preview notes).
/** [catalog id, name] of the spells leaving the pool. */
export const REMOVED_SPELLS = [
  ["BG31_880","Alliance Flag"],
  ["BG28_603","Boon of Beetles"],
  ["BG31_890","Boundless Potential"],
  ["BG28_604","Butchering"],
  ["BG36_371","Energizing Chamber"],
  ["BG31_892","Fandral's Fortune"],
  ["BG36_246","Mighty Dragonbreath"],
  ["BG36_301t","Sludge Corrosion"],
  ["BG34_689","Blood Gem Barrage"],
];
/** Returning unchanged (ids and stats from HearthstoneJSON). */
export const RETURNING_SPELLS = [
  {"id":"BG35_149","name":"Deepwater Clan","description":"Give a minion +2/+2. Give your Murlocs +2/+2.","types":[],"tier":4,"cost":2,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)","change":"Returns to the Tavern spell pool unchanged. Text from HearthstoneJSON."},
  {"id":"EBG_Spell_014","name":"Pointy Arrow","description":"Give a minion +4 Attack.","types":[],"tier":1,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)","change":"Returns to the Tavern spell pool unchanged. Text from HearthstoneJSON."},
];
/** Returning with changes. */
export const RETURNING_CHANGED_SPELLS = [
  {"id":"BG28_814","name":"Echoing Roar","description":"Give a friendly minion \"At the end of your turn, gain +3/+3.\"","types":[],"tier":3,"cost":2,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)","change":"[3 Cost] +2/+2 -> [2 Cost] +3/+3"},
  {"id":"BG33_817","name":"Sanctify","description":"Give your minions with Divine Shield +4 Attack.","types":[],"tier":4,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)","change":"[Tier 5] +6 Attack -> [Tier 4] +4 Attack"},
];
/** New: synthetic ids. */
export const NEW_SPELLS = [
  {"id":"S15_invocation_of_earth","name":"Invocation of Earth","description":"Give a minion +3/+3. If it's an Elemental, also give it Taunt until next turn.","types":[],"tier":2,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_invocation_of_fire","name":"Invocation of Fire","description":"Give a minion +4/+4. If it's an Elemental, also give it Reborn until next turn.","types":[],"tier":3,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_unholy_ritual","name":"Unholy Ritual","description":"Give an Undead \"Deathrattle: Summon two 1/1 Skeletons.\"","types":[],"tier":3,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_goldrinn_s_blessing","name":"Goldrinn's Blessing","description":"Your Beasts have +1/+1 this game (wherever they are).","types":[],"tier":4,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_invocation_of_air","name":"Invocation of Air","description":"Give a minion +5/+5. If it's an Elemental, also give it Windfury until next turn.","types":[],"tier":4,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_tumultuous_growth","name":"Tumultuous Growth","description":"Choose a minion. Cast 2 random Tavern spells (targeting it if possible).","types":[],"tier":4,"cost":2,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_command_the_elements","name":"Command the Elements","description":"Get all 4 Elemental Invocations.","types":[],"tier":5,"cost":3,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_invocation_of_water","name":"Invocation of Water","description":"Give a minion +6/+6. If it's an Elemental, also give it Divine Shield until next turn.","types":[],"tier":5,"cost":1,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
  {"id":"S15_dragonstorm","name":"Dragonstorm","description":"Give your Dragons \"At the end of your turn, gain +2/+2.\"","types":[],"tier":6,"cost":3,"spell":true,"handEntered":true,"patch":"37.2 (preview notes)"},
];

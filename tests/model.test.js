import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plainText,matches,add,remove,move} from '../public/model.js';
const data = JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8'));
test('pinned catalog has expected counts, tiers, mode metadata and zero costs', () => {
  // Counts derive from the data so automatic updates keep passing; every card must still land in a known tier/kind.
  assert.ok(data.minions.length>0); assert.ok(data.trinkets.length>0);
  assert.equal(Array.from({length:7},(_,i)=>data.minions.filter(c=>c.tier===i+1).length).reduce((a,b)=>a+b),data.minions.length);
  assert.equal(data.trinkets.filter(c=>c.kind==='Lesser').length+data.trinkets.filter(c=>c.kind==='Greater').length,data.trinkets.length);
  assert.ok(data.trinkets.some(c=>c.cost===0)); assert.ok(data.minions.some(c=>c.duos));
  assert.ok(data.trinkets.every(c=>!('tier' in c)));
  assert.equal(new Set([...data.minions,...data.trinkets].map(c=>c.id)).size,721);
});
test('normalizes supported markup into plain text without interpreting unsafe tags', () => {
  assert.equal(plainText('[x]<b>Battlecry:</b><br>One &amp; two\n<i>More</i>'),'Battlecry:\nOne & two\nMore');
  assert.equal(plainText('<img onerror="bad()">safe'),'safe'); assert.equal(plainText(),'');
});
test('search combines name/description, multi-tribe, tier and trinket kind; empty resets', () => {
  const card={id:'example',name:'Two tribes',description:'Battlecry: Get a gem',types:['DRAGON','BEAST'],tier:3};
  assert.ok(matches(card,{query:' BATTLECRY ',tribe:'BEAST',tier:'3'}));
  assert.ok(matches(card,{query:'two tribes',tribe:'DRAGON'}));
  assert.equal(matches(card,{tribe:'DEMON'}),false); assert.equal(matches(card,{tier:'2'}),false);
  assert.equal(matches(card,{query:'neverexists'}),false); assert.ok(matches(card,{}));
  const trinket=data.trinkets[0]; assert.ok(matches(trinket,{kind:trinket.kind}));
  assert.equal(matches(trinket,{kind:trinket.kind==='Lesser'?'Greater':'Lesser'}),false);
});
for (const capacity of [7,2]) test(`${capacity} slots keep bounds, overflow, removal and reordering`, () => {
  const slots=Array(capacity).fill(null), card=data.minions[0];
  for(let i=0;i<capacity;i++) assert.ok(add(slots,{...card,id:String(i)}));
  const before=slots.slice(); assert.equal(add(slots,card),false);assert.deepEqual(slots,before);
  assert.equal(move(slots,0,-1),false);assert.equal(move(slots,capacity-1,1),false);
  assert.equal(move(slots,0,2),false); assert.ok(move(slots,0,1));assert.equal(slots[1].id,'0');
  assert.equal(remove(slots,-1),false);assert.equal(remove(slots,capacity),false);
  assert.equal(remove(slots,0.5),false);assert.equal(move(slots,0.5,1),false);
  assert.ok(remove(slots,0));assert.equal(slots[0],null);assert.equal(move(slots,0,1),false);
  assert.ok(add(slots,card));assert.equal(slots.length,capacity);
});
test('board and trinket selections are independent',()=>{
  const board=Array(7).fill(null), trinkets=Array(2).fill(null);
  add(board,data.minions[0]);assert.ok(trinkets.every(c=>c===null));
  add(trinkets,data.trinkets[0]);remove(board,0);assert.equal(trinkets[0],data.trinkets[0]);
});
import {REMOVED_BY_ID,REMOVAL_GROUPS,removalNote} from '../public/removals.js';
import {staleOverrides} from '../scripts/lib/catalog.js';
import {applyRemovals} from '../public/model.js';
test('announced removals: every group has its official source; ids missing from the catalog only warn',()=>{
  for(const group of REMOVAL_GROUPS){assert.match(group.url,/^https:\/\/hearthstone\.blizzard\.com\//);assert.ok(group.date&&group.reason);}
  for(const id of staleOverrides(data,REMOVED_BY_ID.keys()))console.warn(`Warning: removals.js lists ${id}, which is not in the catalog.`);
  assert.equal(REMOVED_BY_ID.size,31);
});
test('removals drop every Naga, Kaleidoscope and Errgl Sticker from the default pool',()=>{
  const pool=applyRemovals(data,REMOVED_BY_ID);
  assert.equal(pool.minions.length,data.minions.filter(c=>!REMOVED_BY_ID.has(c.id)).length);assert.equal(pool.trinkets.length,data.trinkets.filter(c=>!REMOVED_BY_ID.has(c.id)).length);
  assert.ok(pool.minions.length<data.minions.length);assert.ok(pool.trinkets.length<data.trinkets.length);
  assert.ok(data.minions.filter(c=>c.types.includes('NAGA')).every(c=>REMOVED_BY_ID.has(c.id)));
  assert.equal(pool.minions.filter(c=>c.types.includes('NAGA')).length,0);
  assert.equal(pool.trinkets.filter(c=>/Kaleidoscope|Errgl Sticker/.test(c.name)).length,0);
  assert.ok(data.minions.some(c=>REMOVED_BY_ID.has(c.id)),'applyRemovals must not edit the generated catalog');
});
test('a removed card held in a slot keeps working and is flagged; pool cards are not',()=>{
  const naga=data.minions.find(c=>c.types.includes('NAGA')),slots=Array(7).fill(null);
  assert.ok(add(slots,naga));assert.ok(move(slots,0,1));assert.ok(remove(slots,1));
  assert.match(removalNote(naga),/^Removed from the pool: Naga rotated out/);
  assert.equal(removalNote(data.minions.find(c=>!REMOVED_BY_ID.has(c.id))),'');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {TIMEWARP_CARDS, STAGES, matchesTimewarp, addTimewarp, timewarpMeta} from '../public/timewarp.js';

const byStage = stage => TIMEWARP_CARDS.filter(card => card.stage === stage);
test('card lists match the Season 15 preview counts', () => {
  assert.equal(byStage('minor').length, 98);
  assert.equal(byStage('major').length, 108);
  assert.equal(new Set(TIMEWARP_CARDS.map(c => c.id)).size, TIMEWARP_CARDS.length, 'ids are unique');
});
test('every card is complete and stage-consistent', () => {
  for (const c of TIMEWARP_CARDS) {
    assert.ok(c.id && c.name && c.description, `${c.name} needs id, name and description`);
    assert.equal(c.tier, c.stage === 'minor' ? 3 : 5, c.name);
    assert.ok([1, 2, 3].includes(c.cost), `${c.name} cost ${c.cost}`);
    assert.ok(['new', 'returning', 'changed'].includes(c.status), c.name);
    assert.equal(Boolean(c.change), c.status === 'changed', `${c.name} change text only on changed cards`);
    assert.equal(Boolean(c.patch), c.status !== 'returning', `${c.name} patch label on new/changed cards`);
  }
});
test('Timewarped Piggy Bank is a new Minor spell for 1 Chronum', () => {
  const piggy = TIMEWARP_CARDS.find(c => c.name === 'Timewarped Piggy Bank');
  assert.deepEqual([piggy?.stage, piggy?.cost, piggy?.cardType, piggy?.status], ['minor', 1, 'spell', 'new']);
});
test('filters combine and search is case-insensitive', () => {
  const piggy = TIMEWARP_CARDS.find(c => c.name === 'Timewarped Piggy Bank');
  assert.ok(matchesTimewarp(piggy, {query: ' PIGGY ', stage: 'minor', cardType: 'spell'}));
  assert.ok(!matchesTimewarp(piggy, {stage: 'major'}));
  assert.ok(!matchesTimewarp(piggy, {cardType: 'minion'}));
});
test('addTimewarp fills the slot of the card stage and refuses a taken slot', () => {
  const slots = [null, null];
  const [minor] = byStage('minor'), [major] = byStage('major');
  assert.ok(addTimewarp(slots, major));
  assert.equal(slots[STAGES.indexOf('major')], major);
  assert.equal(slots[0], null);
  assert.ok(addTimewarp(slots, minor));
  assert.equal(addTimewarp(slots, byStage('minor')[1]), false);
});
test('meta line shows stage, tier, Chronum cost and type', () => {
  const piggy = TIMEWARP_CARDS.find(c => c.name === 'Timewarped Piggy Bank');
  assert.equal(timewarpMeta(piggy), 'Minor Timewarp · Tier 3 · 1 Chronum · Tavern spell');
});

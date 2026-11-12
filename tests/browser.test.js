import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {applyRemovals} from '../public/model.js';
import {REMOVED_BY_ID} from '../public/removals.js';
// Expected pool sizes derive from the committed catalog so automatic data updates do not need test edits.
const pool = applyRemovals(JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8')),REMOVED_BY_ID);
const build = JSON.parse(readFileSync(new URL('../public/build.json',import.meta.url),'utf8'));
const greaterCount = pool.trinkets.filter(c=>c.kind==='Greater').length;
test.beforeEach(async({page})=>{
  await page.route('https://art.hearthstonejson.com/**',route=>route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.goto('/'); await expect(page.locator('#result-count')).toContainText(`${pool.minions.length} minions`);
});
test('pool is the catalog minus announced removals, dated and sourced',async({page})=>{
  const notice = page.locator('.notice');
  await expect(notice).toContainText('minus officially announced removals as of November 11, 2026; other changes may be missed');
  await expect(notice).toContainText('not verified');
  await expect(notice.getByRole('link',{name:'Season 14 includes Trinkets'})).toHaveAttribute('href','https://hearthstone.blizzard.com/en-us/news/24290433/announcing-battlegrounds-season-14-dark-gifts-of-dalaran');
  await expect(notice.getByRole('link',{name:'official rotation changes'})).toHaveAttribute('href','https://hearthstone.blizzard.com/en-us/news/24302091/aberrations-join-battlegrounds-at-blizzcon');
  await expect(page.locator('#result-count')).toContainText('minus announced removals');
  await expect(page.locator('#tribe option[value="NAGA"]')).toHaveCount(0);
  await page.getByLabel('Search name or description').fill('Waverider');
  await expect(page.locator('.pool-card')).toHaveCount(0);
  await page.getByLabel('Search name or description').fill('');
  await page.getByRole('button',{name:'Trinkets',exact:true}).click();
  await expect(page.locator('#result-count')).toContainText(`${pool.trinkets.length} trinkets`);
  for(const name of ['Kaleidoscope','Errgl Sticker']){
    await page.getByLabel('Search name or description').fill(name);
    await expect(page.locator('.pool-card')).toHaveCount(0);
  }
});

test('header badge and footer show the build from build.json',async({page})=>{
  await expect(page.locator('#build-badge')).toHaveText(`CATALOG ${build.build} · MINUS REMOVALS`);
  await expect(page.locator('#build-info')).toHaveText(`${build.build}, retrieved ${build.retrieved}`);
});
test('search and combined filters, no matches and reset, trinket type without tier',async({page})=>{
  await page.getByLabel('Search name or description').fill('blood gem');
  await page.getByLabel('Tribe / type').selectOption('QUILBOAR');
  await page.getByLabel('Tavern tier').selectOption('1');
  await expect(page.locator('.pool-card')).toHaveCount(1);
  await expect(page.locator('.pool-card')).toContainText('Razorfen Geomancer');
  await page.getByLabel('Search name or description').fill('zzzznomatch');
  await expect(page.locator('.no-results')).toBeVisible();
  await page.getByRole('button',{name:'Reset filters'}).click();
  await expect(page.locator('.pool-card')).toHaveCount(pool.minions.length);
  await page.getByRole('button',{name:'Trinkets',exact:true}).click();
  await expect(page.getByLabel('Tavern tier')).toBeHidden();
  await page.getByLabel('Trinket type').selectOption('Greater');
  await expect(page.locator('.pool-card')).toHaveCount(greaterCount);
  await page.getByLabel('Search name or description').fill('portrait');
  const count=await page.locator('.pool-card').count();expect(count).toBeGreaterThan(0);expect(count).toBeLessThan(greaterCount);
  await expect(page.locator('.pool-card').first().locator('.card-meta')).toContainText('Greater trinket · Cost');
  await expect(page.locator('.pool-card').first().locator('.card-meta')).not.toContainText('Tier');
  await page.getByRole('button',{name:'Reset filters'}).click();await expect(page.locator('.pool-card')).toHaveCount(pool.trinkets.length);
});
test('seven and two fixed slots, limits, reorder, removal and independent clear',async({page})=>{
  await expect(page.locator('#board .slot')).toHaveCount(7);await expect(page.locator('#trinket-slots .slot')).toHaveCount(2);
  await page.getByLabel('Search name or description').fill('Razorfen Geomancer');
  const add=page.getByRole('button',{name:'Add Razorfen Geomancer',exact:true});
  for(let i=0;i<7;i++) await add.click();
  await expect(page.locator('#board .filled')).toHaveCount(7);await add.click();await expect(page.getByRole('status')).toContainText('Board is full');
  await expect(page.getByRole('button',{name:'Move Razorfen Geomancer left from slot 1',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Move Razorfen Geomancer right from slot 7',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Remove Razorfen Geomancer from board slot 2',exact:true}).click();
  await page.getByRole('button',{name:'Move Razorfen Geomancer right from slot 1',exact:true}).click();
  await expect(page.locator('#board .slot').nth(0)).toHaveClass(/empty/);await expect(page.locator('#board .slot').nth(1)).toContainText('Razorfen Geomancer');
  await expect(page.locator('#board .slot').nth(1)).toBeFocused();
  await add.click(); await expect(page.locator('#board-count')).toHaveText('7 / 7');
  await page.getByRole('button',{name:'Reset filters'}).click();await page.getByRole('button',{name:'Trinkets',exact:true}).click();
  const tadd=page.locator('.pool-card button').first();await tadd.click();await tadd.click();await tadd.click();
  await expect(page.getByRole('status')).toContainText('Trinket selection is full');
  await expect(page.locator('#trinket-slots .slot')).toHaveCount(2);await expect(page.locator('#trinket-slots .filled')).toHaveCount(2);
  await page.locator('#trinket-slots button').first().click();await expect(page.locator('#trinket-count')).toHaveText('1 / 2');
  await page.getByRole('button',{name:'Clear board',exact:true}).click();await expect(page.locator('#board .empty')).toHaveCount(7);await expect(page.locator('#trinket-count')).toHaveText('1 / 2');
  await page.getByRole('button',{name:'Clear trinkets',exact:true}).click();await expect(page.locator('#trinket-slots .empty')).toHaveCount(2);
});
test('failed art stays usable and mobile layout has no horizontal overflow',async({page})=>{
  await expect(page.locator('.pool-card .unavailable').first()).toContainText('Art unavailable');
  await page.locator('.pool-card button').first().click();await expect(page.locator('#board .unavailable')).toContainText('Art unavailable');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for(const slot of await page.locator('#board .slot').all()) await expect(slot).toBeVisible();
  await page.getByLabel('Search name or description').fill('zzzz');await expect(page.locator('.no-results')).toBeVisible();
});
test('catalog fetch failure gives an actionable visible error',async({page})=>{
  await page.route('**/catalog.json',route=>route.fulfill({status:500,body:'failed'}));await page.reload();
  await expect(page.getByRole('status')).toContainText('Could not load the catalog');
});

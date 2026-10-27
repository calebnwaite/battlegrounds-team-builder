import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';

const catalog = JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8'));
const samples = [
  {id:'BG20_100',pool:'minions'},
  {id:'BG30_MagicItem_301',pool:'trinkets'},
  {id:'BG30_MagicItem_310',pool:'trinkets'},
];

// Live service checks are separate from deterministic UI/failure-path tests.
for (const {id,pool} of samples) test(`external artwork decodes: ${id}`,async({page},testInfo)=>{
  test.setTimeout(45000);
  const card = catalog[pool].find(item=>item.id===id);
  expect(card,`Pinned catalog must contain the known image sample ${id}`).toBeTruthy();
  const artUrl = `https://art.hearthstonejson.com/v1/256x/${id}.jpg`;
  await page.route('https://art.hearthstonejson.com/**',route=>route.request().url()===artUrl ? route.continue() : route.abort());
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  const responses = [];
  page.on('response',response=>{
    if(response.url()===artUrl) responses.push(`HTTP ${response.status()}`);
  });
  page.on('requestfailed',request=>{
    if(request.url()===artUrl) responses.push(request.failure()?.errorText ?? 'Request failed without a network reason');
  });
  try {
    await page.goto('/');
    await expect(page.locator('#result-count')).toContainText('303 minions');
    if(pool==='trinkets') await page.getByRole('button',{name:'Trinkets',exact:true}).click();
    await page.getByLabel('Search name or description').fill(card.name);
    const tile = page.locator('.pool-card').filter({has:page.getByRole('heading',{name:card.name,exact:true})});
    await expect(tile).toHaveCount(1);
    await tile.scrollIntoViewIfNeeded();
    await expect.poll(async()=>tile.locator('img').evaluateAll(images=>images.some(image=>image.complete && image.naturalWidth>0)),{
      timeout:30000,
      message:`Known artwork ${id} must decode with naturalWidth > 0; check image API reachability or asset removal`,
    }).toBe(true);
    await testInfo.attach(`${id}-decoded`,{body:await tile.screenshot(),contentType:'image/png'});
  } finally {
    await testInfo.attach(`${id}-network`,{body:Buffer.from(`${artUrl}\n${responses.join('\n') || 'No response or request failure observed'}`),contentType:'text/plain'});
  }
});

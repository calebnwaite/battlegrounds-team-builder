import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {API_ROOT, buildCatalog, buildUrl, diffCatalogs, formatSummary, readJson, sha256, staleOverrides, writeBuildInfo, writeCatalog} from './catalog.js';

const isoDate = (/** @type {string | Date} */ d) => new Date(d).toISOString().slice(0, 10);

async function get(fetchImpl, url) {
  let response;
  try { response = await fetchImpl(url); } catch (error) { throw new Error(`Could not reach ${url}: ${error.message}`, {cause: error}); }
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  return response;
}

/** The /v1/latest/ index links to the newest build directory (the cards.json URL itself does not redirect). */
export async function resolveLatestBuild(fetchImpl = fetch) {
  const html = await (await get(fetchImpl, `${API_ROOT}latest/`)).text();
  const build = Number(html.match(/\/v1\/(\d+)\//)?.[1]);
  if (!Number.isInteger(build)) throw new Error(`Could not find a build number in ${API_ROOT}latest/; HearthstoneJSON index format may have changed.`);
  return build;
}

/**
 * @param {{root: string, check?: boolean, fetchImpl?: typeof fetch, now?: Date, removedIds?: Iterable<string>, summaryPath?: string, log?: (m: string) => void, warn?: (m: string) => void}} options
 */
export async function runUpdate({root, check = false, fetchImpl = fetch, now = new Date(), removedIds = [], summaryPath, log = console.log, warn = console.warn}) {
  const buildFile = path.join(root, 'public', 'build.json');
  const catalogFile = path.join(root, 'public', 'catalog.json');
  const pinned = readJson(buildFile);
  const latest = await resolveLatestBuild(fetchImpl);
  if (latest <= pinned.build) { log(`Up to date: pinned build ${pinned.build}, latest ${latest}.`); return {changed: false, latest}; }

  const url = buildUrl(latest);
  const response = await get(fetchImpl, url);
  const raw = Buffer.from(await response.arrayBuffer());
  const download = path.join(mkdtempSync(path.join(tmpdir(), 'bg-cards-')), `cards-${latest}.json`);
  writeFileSync(download, raw);
  const catalog = buildCatalog(JSON.parse(raw.toString()));
  if (!catalog.minions.length || !catalog.trinkets.length) throw new Error(`Build ${latest} yielded ${catalog.minions.length} minions and ${catalog.trinkets.length} trinkets; refusing to update (download kept at ${download}).`);

  const info = {build: latest, url, sha256: sha256(raw), lastModified: response.headers.get('last-modified') ? isoDate(response.headers.get('last-modified')) : 'unknown', retrieved: isoDate(now)};
  const diff = diffCatalogs(readJson(catalogFile), catalog);
  const stale = staleOverrides(catalog, removedIds);
  for (const id of stale) warn(`Warning: removals.js lists ${id}, which is not in build ${latest}; entry kept but has no effect.`);
  const summary = formatSummary({from: pinned, to: info, diff, stale});
  log(summary);
  if (check) { log(`--check: build ${latest} is newer than pinned ${pinned.build}; nothing written.`); return {changed: true, written: false, latest, diff}; }

  writeCatalog(catalogFile, catalog);
  writeBuildInfo(buildFile, info);
  if (summaryPath) writeFileSync(summaryPath, summary);
  log(`Updated to build ${latest}: ${catalog.minions.length} minions, ${catalog.trinkets.length} trinkets. Raw download: ${download}`);
  return {changed: true, written: true, latest, diff};
}

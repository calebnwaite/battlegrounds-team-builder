import {test, expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {applyRemovals} from '../public/model.js';
import {REMOVED_BY_ID} from '../public/removals.js';

// Mirrors GitHub Pages project hosting: the site lives under /battlegrounds-team-builder/, nothing is served at the origin root.
const PREFIX = '/battlegrounds-team-builder/';
const PORT = 4320;
const root = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json'};
/** @type {import('node:http').Server} */
let server;
const requested = [];
const pool = applyRemovals(JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8')), REMOVED_BY_ID);

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    requested.push(pathname);
    if (!pathname.startsWith(PREFIX)) { res.writeHead(404).end('Not found'); return; }
    const file = path.resolve(root, pathname.slice(PREFIX.length) || 'index.html');
    try {
      const data = await readFile(file.endsWith(path.sep) ? file + 'index.html' : file);
      res.writeHead(200, {'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream'}).end(data);
    } catch (error) {
      console.error('Subpath server could not read', file, error.message);
      res.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, '127.0.0.1', () => resolve(undefined)); });
});
test.afterAll(() => new Promise(resolve => server.close(resolve)));

test('app loads its catalog, build info, styles and modules from a subpath', async ({page}) => {
  await page.route('https://art.hearthstonejson.com/**', route => route.abort());
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  const failed = [];
  page.on('response', r => { if (r.url().startsWith(`http://127.0.0.1:${PORT}`) && !r.ok()) failed.push(r.url()); });
  await page.goto(`http://127.0.0.1:${PORT}${PREFIX}`);
  await expect(page.locator('#result-count')).toContainText(`${pool.minions.length} minions`);
  await expect(page.locator('#build-info')).toContainText('retrieved');
  expect(failed).toEqual([]);
  expect(requested.filter(p => !p.startsWith(PREFIX))).toEqual([]);
});

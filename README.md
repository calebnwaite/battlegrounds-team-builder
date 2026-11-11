# Tavern Workshop

A local-only Battlegrounds composition sandbox. Seven visible minion slots and two independent trinket slots, searchable names/descriptions, tribe/tavern-tier filters, Lesser/Greater trinket filters, removal and adjacent board reordering. No accounts, paid statistics, simulation, or persistence.

## Launch

Install Node.js 22 or newer. No dependencies are needed to run the app:

```powershell
node scripts/server.js
```

Open **http://127.0.0.1:4318** on the same computer. The server binds only to IPv4 loopback. If occupied, use another unused port (PowerShell):

```powershell
$env:PORT = '4320'; node scripts/server.js
```

Images load from HearthstoneJSON and optional fonts from Google; offline or unavailable images have a visible fallback. Reload resets selections. Copies are allowed; this is composition planning, not a validator for mode/season-specific legality. Slots wrap on narrow screens, but all seven/two remain present.

## Development and verification

With npm available: `npm ci`, then `npx playwright install chromium`. Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run test:browser`. The browser suite starts its own server on unused loopback port 4319 and shuts it down; do not run another app there. `npm test` is the full unit suite. `tests/browser.test.js` blocks external artwork/fonts for deterministic image-failure coverage. The separate `tests/external-images.test.js` requires internet access and checks actual decoded artwork (`naturalWidth > 0`) for minion BG20_100 and trinkets BG30_MagicItem_301/BG30_MagicItem_310, with a 30-second decode timeout per sample. It attaches decoded screenshots and sample-specific network outcomes; live service/network failures are not silently skipped. Both files run with `npm run test:browser`.

On the development computer npm was absent from PATH; a local ignored bootstrap was downloaded from https://registry.npmjs.org/npm/-/npm-10.9.2.tgz and unpacked into `.tools`. Equivalent npm invocation there is `node .tools/package/bin/npm-cli.js <command>`. This bootstrap is not required for launching or shipped as project source. Standard Node/npm installation elsewhere is sufficient.

## Data provenance and reproduction

Source: https://api.hearthstonejson.com/v1/255790/enUS/cards.json (HearthstoneJSON/HearthSim), build **37.0.0.255790**, Last-Modified October 13, 2026, retrieved October 27, 2026. SHA256: `06e61ce4afd2bce9c2ff53de8c2c1cc0080df27aa4743c8eee3d63894d10dc04`.

The pin (build number, URL, SHA256, Last-Modified and retrieval date) lives in `public/build.json`; the build recorded above is the initial pin and `build.json` is authoritative after automatic updates. To regenerate the catalog from a download of the pinned build, store it outside the served directory, then run:

```powershell
node scripts/extract.js path-to-downloaded-cards.json
```

The extractor verifies the SHA256 in `public/build.json` before producing minimal `public/catalog.json`; the full raw 10MB file is not shipped. Minions: `type=MINION`, `isBattlegroundsPoolMinion=true`, no `battlegroundsNormalDbfId` (exclude golden variants): **303**, tiers 1–7: **26,41,53,69,62,38,14**. Tier uses `techLevel`, not cost. Types use `races` with `race` fallback; Duos label uses `isBattlegroundsDuosExclusive`.

Trinkets: `type=BATTLEGROUND_TRINKET`, `spellSchool=LESSER_TRINKET/GREATER_TRINKET`, excluding shop placeholders `BG30_Trinket_1st` and `BG30_Trinket_2nd`: **200 Lesser + 218 Greater**. Trinkets show type/cost (including zero), never an invented tavern tier. Missing cost displays unknown.

The picker shows the pinned catalog **minus officially announced removals** (`public/removals.js`; 279 minions, 411 trinkets), including tier 7 and Duos cards. Trinkets lack an active flag; individual current rotation/mode eligibility is not certified. Official Season 14 and seasonal Trinket availability were checked October 28, 2026; see [source/freshness review](SOURCES.md) for official links, known catalog-versus-rotation differences and unresolved coverage. No claim of exhaustive current-season coverage. Description markup is normalized to plain text and rendered via textContent, never unsafe HTML.

Square art: `https://art.hearthstonejson.com/v1/256x/{id}.jpg`, documented at https://hearthstonejson.com/docs/images.html. Full image coverage is not verified; errors show a fallback without losing card details. HSReplay is not scraped or used. Hearthstone and game content © Blizzard Entertainment. Attribution: HearthstoneJSON/HearthSim (https://hearthstonejson.com/). Website CC0 does not license the game data. This unofficial fan project is not endorsed by Blizzard.

## Automatic data updates

HearthstoneJSON publishes numbered builds. `node scripts/update.js` finds the newest one (the link list at https://api.hearthstonejson.com/v1/latest/; the `cards.json` URL itself does not redirect), compares it with the pinned build and, if newer, downloads `/v1/<build>/enUS/cards.json` to the system temp folder, applies the same Battlegrounds-only filters as `scripts/extract.js` (shared in `scripts/lib/catalog.js`), and rewrites `public/catalog.json` and `public/build.json` (the SHA256 is computed from that actual download). It prints a Battlegrounds-only summary of cards added, removed and changed (name, tier, tribes, text, cost, type) and writes it as markdown to `update-summary.md` (ignored by git; `--summary <path>` changes the location).

```powershell
node scripts/update.js --check   # dry run: report only, writes nothing
node scripts/update.js           # update the catalog and pin
```

Unknown arguments are rejected (exit 2 with a usage message) so a mistyped dry run can never write. Exit code 0 means no change or a successful update; non-zero means an error (network failure, unexpected index format, an empty result), reported on stderr. The footer build number comes from `public/build.json`.

**Overrides stay manual.** `public/removals.js` is never written by the update. If it lists an id that is no longer in the catalog, the script and the tests warn but do not fail. **Pool rotation cannot be detected from HearthstoneJSON** (removed Naga, for example, still appear in the data), so `removals.js` must be updated by hand from official Blizzard patch notes, with the official URL and date for each entry.

### Workflow

`.github/workflows/update-data.yml` runs weekly and on demand: Node 22, `npm ci`, the update script, unit tests, lint, typecheck, the offline browser tests, then opens a pull request with `peter-evans/create-pull-request` (branch `automation/update-battlegrounds-data`, body is the summary). It never commits to main, uses only `contents: write` and `pull-requests: write`, and does nothing until the project is hosted on GitHub. In the repository settings, **Settings > Actions > General > Workflow permissions > "Allow GitHub Actions to create and approve pull requests" must be on**, because the PR step uses `GITHUB_TOKEN`. Pull requests opened with `GITHUB_TOKEN` do not start other workflows; the update workflow already ran the checks itself. Review the PR diff and check `removals.js` against the latest patch notes before merging.

## Publishing on GitHub Pages

`.github/workflows/pages.yml` deploys `public/` with the official Pages actions on every push to main (and on demand). Enable Pages with source "GitHub Actions". The site works from a project subpath such as `https://<user>.github.io/battlegrounds-team-builder/`: every asset, catalog and module URL is relative, and `tests/subpath.test.js` serves the app under a subpath to prove it. Card art remains links to art.hearthstonejson.com; no images are stored in the repository.

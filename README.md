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

With npm available: `npm ci`, then `npx playwright install chromium`. Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run test:browser`. The browser suite starts its own server on unused loopback port 4319 and shuts it down; do not run another app there. `npm test` is the full unit suite. Browser tests block external artwork/fonts for deterministic image-failure coverage.

On the development computer npm was absent from PATH; a local ignored bootstrap was downloaded from https://registry.npmjs.org/npm/-/npm-10.9.2.tgz and unpacked into `.tools`. Equivalent npm invocation there is `node .tools/package/bin/npm-cli.js <command>`. This bootstrap is not required for launching or shipped as project source. Standard Node/npm installation elsewhere is sufficient.

## Data provenance and reproduction

Source: https://api.hearthstonejson.com/v1/255790/enUS/cards.json (HearthstoneJSON/HearthSim), build **37.0.0.255790**, Last-Modified October 13, 2026, retrieved October 27, 2026. SHA256: `06e61ce4afd2bce9c2ff53de8c2c1cc0080df27aa4743c8eee3d63894d10dc04`.

Download that file outside the served directory, then run:

```powershell
node scripts/extract.js path-to-downloaded-cards.json
```

The extractor verifies the SHA256 before producing minimal `public/catalog.json`; the full raw 10MB file is not shipped. Minions: `type=MINION`, `isBattlegroundsPoolMinion=true`, no `battlegroundsNormalDbfId` (exclude golden variants): **303**, tiers 1–7: **26,41,53,69,62,38,14**. Tier uses `techLevel`, not cost. Types use `races` with `race` fallback; Duos label uses `isBattlegroundsDuosExclusive`.

Trinkets: `type=BATTLEGROUND_TRINKET`, `spellSchool=LESSER_TRINKET/GREATER_TRINKET`, excluding shop placeholders `BG30_Trinket_1st` and `BG30_Trinket_2nd`: **200 Lesser + 218 Greater**. Trinkets show type/cost (including zero), never an invented tavern tier. Missing cost displays unknown.

This is a **historical build catalog**, including tier 7 and Duos cards. Trinkets lack an active flag; current rotation/mode availability is unknown. No claim of exhaustive current-season coverage. Description markup is normalized to plain text and rendered via textContent, never unsafe HTML.

Square art: `https://art.hearthstonejson.com/v1/256x/{id}.jpg`, documented at https://hearthstonejson.com/docs/images.html. Full image coverage is not verified; errors show a fallback without losing card details. HSReplay is not scraped or used. Hearthstone and game content © Blizzard Entertainment. Attribution: HearthstoneJSON/HearthSim (https://hearthstonejson.com/). Website CC0 does not license the game data. This unofficial fan project is not endorsed by Blizzard.

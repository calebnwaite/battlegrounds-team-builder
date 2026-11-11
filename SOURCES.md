# Source and freshness review

Checked October 28 and updated October 30, 2026. The default pool is **the pinned catalog minus officially announced removals as of October 30, 2026; other changes may be missed.** The pinned build's 303 minions and 418 trinkets are catalog counts; after removals the picker offers 279 minions and 411 trinkets. This is not an active-pool validator.

## Applied removals

`public/removals.js` lists each removed card id with its official URL and date; `catalog.json` is never edited. Removed: all 24 Naga-type minions (Aberrations update, announced September 12, effective September 22) and seven trinkets from that article's Removed Lesser/Greater Trinkets lists: Automaton Portrait, Errgl Sticker, both Kaleidoscope variants, Avalanche Sticker, Amplifying Essence and Assembler Portrait. Matching is by unique card name; the catalog's Lesser/Greater label for four of them differs from the article's section, which does not change the removal. The other minions in that article's Removed Minions list, and the 36.6.3 removals (Briarback Drummer, Timewarped Thorncaller), are already absent from the catalog's pool flag. The 36.6.3 notes list no removed trinkets. A removed card still held in a slot keeps working and shows a visible removal flag.

## Official seasonal evidence

- [Season 14: Dark Gifts of Dalaran](https://hearthstone.blizzard.com/en-us/news/24290433/announcing-battlegrounds-season-14-dark-gifts-of-dalaran), July 27, 2026: season starts August 4; Trinkets remain alongside Dark Gifts, with 23 new Lesser and 24 new Greater Trinkets.
- [36.2 patch notes](https://hearthstone.blizzard.com/en-us/news/24290432/362-patch-notes), August 3: confirms Season 14 and its start, 96 minions removed, 62 new and 31 returning minions. These are change counts, not pool totals.
- [Aberrations update](https://hearthstone.blizzard.com/en-us/news/24302091/aberrations-join-battlegrounds-at-blizzcon), September 12: effective September 22, Aberrations join and Naga rotate out; Naga-specific heroes/cards become unavailable. Lists Lesser/Greater Trinket additions, removals and returns, including removal of Kaleidoscope from both pools and Errgl Sticker from Greater.
- [36.6.3 patch notes](https://hearthstone.blizzard.com/en-us/news/24303864/3663-patch-notes), October 1: returning minions Ship Master Eudora, Eternal Tycoon and Jailbird Juggernaut; removed Briarback Drummer and Timewarped Thorncaller. Aberrations no longer guaranteed in every lobby; new Trinket appearance rates return to normal. Contains additional Trinket cost/text changes.
- [37.0 patch notes](https://hearthstone.blizzard.com/en-us/news/24301454/370-patch-notes), October 12: October 13 patch includes Battlegrounds bug fixes, not a newly announced Battlegrounds season.

The official news index reviewed through October 20 still identifies Season 14 as the latest announced Battlegrounds season. This supports Season 14 as the active season on the review date; it does not prove every card's eligibility or exclude unlisted hotfixes.

## What remains unresolved

The official [Battlegrounds card library](https://hearthstone.blizzard.com/en-us/battlegrounds/) rendered “No results found in Battlegrounds” during this review. That is an unavailable verification source, not evidence of an empty pool. The patch articles are incremental changes rather than a complete machine-readable current roster.

The newest HearthstoneJSON build (checked October 30, still 255790) contains the Naga minions and removed trinkets despite the official notices, hence the exclusion list above. Trinket availability as a seasonal mechanic is verified; exhaustive active Lesser/Greater membership, lobby-specific eligibility, later hotfixes and full artwork coverage are **not verified**. No fabricated active flag is supplied; only announced removals are subtracted. Tier 7 and Duos entries are retained and labeled; selection does not imply legality.

## Data and artwork

See README for the pinned build URL, hash, extraction rules and reproduction. HearthstoneJSON/HearthSim supplies data and square artwork; Blizzard owns the game content. No HSReplay data, layout or assets are extracted. Successful representative image decoding does not certify all 721 catalog assets. Offline/error artwork remains an explicitly tested fallback.

## Keeping data current

`scripts/update.js` (see README) updates the catalog and pin in `public/build.json` from the newest HearthstoneJSON build, and the weekly workflow proposes the result as a pull request. HearthstoneJSON cannot tell us which cards rotated out of the Battlegrounds pool, so `public/removals.js` remains a manual list built from official Blizzard patch notes; the freshness review above must be repeated by a person when notes are published. The review above describes the originally pinned build 255790; after an update the build number, hash and dates are in `public/build.json` and the pull request summary.

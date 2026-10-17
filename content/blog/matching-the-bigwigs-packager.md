---
title: Matching the BigWigs packager on 36 addons
date: 2026-10-12
author: DomenikIrrgang
tags: migration, testing
version: 0.7
summary: wowlua init --from-pkgmeta adopts a packager project. Thirty-six addons, packaged by the packager and built by wowlua at pinned commits, load identical code in every flavor and client locale.
---

Most addons that would move to wowlua are built by the BigWigs packager today. Moving should change nothing a player can notice. So the exit check of milestone M6 asks one question: does an addon adopted with `wowlua init --from-pkgmeta` build the same AddOn as the packager?

## What "the same" means

wowlua moves sources into `src/` and copies only the library files the game loads, so a byte-for-byte diff of the two zips would always fail. [Decision T119](https://github.com/DomenikIrrgang/wowlua/blob/main/spec/appendix/decisions.md) defines the comparison instead. For every flavor, both builds must:

- load the same files in the same order, byte-identical (in-game paths may name `src/`);
- ship identical assets;
- carry the same TOC directives, apart from `Version` and `X-Wowlua-*`.

Files only the packager ships that the game never loads are listed, but allowed.

## How the check runs

Both tools package the same commit at the same time, so unpinned externals resolve to the same revisions. The packager runs the way each project's CI runs it: multi-version, with `-S`, or game by game with `-g` and `-m`. Then `cargo xtask packager-diff` compares the loaded files, assets and TOC directives per flavor.

```sh
ADDON_REPO=https://github.com/Nevcairiel/Bartender4 \
  scripts/packager-compat.sh   # needs bash 4+, git, svn, curl, unzip
```

On the wowlua side, adoption is one command. The TOC files become `wowlua.json`, Lua and XML files move into `src/`, `.pkgmeta` externals become dependencies, and compatibility settings are read from `.pkgmeta` and the project's CI workflows.

```yaml
package-as: MyAddon
externals:
  Libs/LibStub: https://repos.wowace.com/wow/libstub/trunk
  Libs/AceAddon-3.0: https://repos.wowace.com/wow/ace3/trunk/AceAddon-3.0
```

## The 36 addons

Every addon below was built at a pinned commit by both tools. All of them load identical code in every flavor and client locale and ship the same files, with the packager's line endings and TOC versions. A selection, with the number of AddOn folders each ships:

| addon | folders | note |
|---|---|---|
| BigWigs | 12 | |
| LittleWigs | 12 | |
| DBM | 8 | voice pack as an external addon |
| Details | 8 | |
| AtlasLootClassic | 8 | |
| Dominos | 6 | |
| WeakAuras | 5 | |
| ElvUI | 3 | |
| Bartender4 | 1 | the check script's default |

The rest: Inventorian, Plater, Masque, Mapster, Quartz, BugSack, SimulationCraft, AdvancedInterfaceOptions, GatherMate2, ShadowedUnitFrames, RCLootCouncil2, omnibar, Capping, BigWigs_Voice, BigWigs_Classic, SexyMap, MythicDungeonTools, TellMeWhen, AllTheThings, OmniCC, Cell, TotalRP3, BlizzMove, QuickQuest, BigWigs_WrathOfTheLichKing, Tukui and KuiNameplates.

> [!WARNING]
> Rarity and hekili are left out. The packager itself cannot fetch their LibCompress SVN external. wowlua still adopts and builds both.

## What it doesn't cover

The check is static. It compares what the client would load, not how the addons behave once loaded. It runs weekly in CI as the `packager-compat` workflow, so a change that breaks equivalence shows up within a week.

> [!TIP]
> Moving your own addon? Start with the [adoption guide](/docs/adopting-an-addon). `init` leaves your packager workflows untouched and prints the change to `wowlua publish`.

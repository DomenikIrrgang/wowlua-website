---
title: A world behind your UI
date: 2026-11-13
author: DomenikIrrgang
tags: testing, emulator, agents
version: 0.13
summary: Ten patch releases since 0.13.1 put the 3D world behind the emulated UI, turned your real character into a test profile, measured your addon frame by frame, and let an AI agent work in any addon without setup.
---

wowlua 0.13.0 closed the registry milestone, and 0.13.1 followed a day later. The ten patch releases since, up to 0.13.11, went into the emulated client: what your addon sees, what it costs, and who can drive it. Here is what changed.

## The world behind the UI

Until 0.13.8 the emulated client drew your addon with nothing behind it. Now `--world` stands your character and the units on the zone's ground, read from your WoW installation:

```console
$ wowlua test --world
$ wowlua screenshot tests/zone.test.wowlua --world -o zone.png
```

![wowlua screenshot --world: a level 1 character in Northshire Valley in front of the abbey, test NPCs named with their titles, and Blizzard's UI over the world](/landing/world-northshire.webp)

That picture is `wowlua screenshot --world` with no game client running. The terrain, buildings and trees come from the installation. The light is the zone's own at the realm's time of day, and the sun casts shadows as your Shadow Quality setting says. Lakes and lava move, and banners and mills turn near you. `mock.setWeather("rain", 0.5)` makes it rain. Units walk, patrol, attack and cast, and a Fireball flies to its target and bursts on it. Nameplates follow their units, and names float over them with an NPC's title underneath.

The world is off by default, so the places a test gives stay as they are and tests run the same in CI without an installation.

## A world to test in

The world in the picture is `northshire`, a world profile that comes with wowlua for WoW Forever. Name it with `config({ profile = "northshire" })` and your test starts at Northshire's start among test NPCs: vendors selling the game's own items, a trainer of each class, a banker, an auctioneer, a postmaster, a flight master, and a kobold, a wolf and an elite bear to fight.

You can also take your own character into a test. With a dev build loaded, `/wl snapshot` records your character's gear, bags, action bars, auras, target and settings. Back in your addon's folder, `wowlua profile snapshot raid` writes it as `tests/profiles/raid.json`, without your character's name and realm.

More of the game answers as it does in WoW Forever: every power a class has, racial spells, shields and heal prediction, arena opponents on `arena1` to `arena5`, the pet's spellbook, Beast Training, group loot rolls, and the click bindings Blizzard's unit frames follow.

## What your addon costs, per frame

`wowlua perf run` plays the test files marked `config({ perf = true })` and measures each test per frame: your addon's instructions, an estimated cost for the game's own functions, the memory it allocates and its garbage collections. `wowlua perf baseline` writes the numbers to `tests/perf-baseline.json`, and the next `wowlua perf run` fails when a measure got more than 2% worse. The numbers are the same on every machine and every run, so the check works in CI.

Profiles from `wowlua test --profile-out` now give each game function an estimated cost too, so building frames no longer looks free. Next to each profile is a summary of every frame. `GetAddOnMemoryUsage` measures your addon alone, as in the game.

## AI agents, in any addon

Register `wowlua mcp` once (`claude mcp add --scope user wowlua -- wowlua mcp`) and it works in every addon folder, even one without `wowlua.json`: the addon is adopted in memory and nothing is written in its folder. The agent can now `check`, `fmt`, `build` and `test` its own fix, `pick` the frame at a point of a screenshot and `inspect` it, list the world's `units`, log the game `events`, and read wowlua's docs for the version you run, offline.

## In the editor

Since 0.13.2 the language server colours names by what they are, folds functions, tables, comments and imports, shows the inferred type after a `local`, offers a warning's fixes as quick fixes, and counts each function's references above it. VS Code shows all of it with the [wowlua extension](https://marketplace.visualstudio.com/items?itemName=wowlua.wowlua).

## Which flavors run

The flavor table now says plainly what runs where. WoW Forever (`camelot`) runs in every part of wowlua: tests, the emulated client, the debugger and Blizzard's UI. Retail, Classic Era, TBC Anniversary and MoP Classic are checked and built like the others, with the emulator coming. Wrath of the Lich King Classic and Cataclysm Classic are no longer flavors of wowlua.

> [!TIP]
> Run the installer again to update ([install](/docs/guide/install#update-or-pin-a-version)). The [changelog](/changelog) has every change, release by release.

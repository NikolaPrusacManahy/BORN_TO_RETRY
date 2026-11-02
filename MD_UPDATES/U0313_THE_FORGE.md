# Update 0.3.13 — floor 8, The Forge: its level (enemies and boss later)

Status: built (2026-11-02). The designer, after floor 7's level ("Floor 7 design is fine"): "I won't plan enemies on
floor 7 yet, I want all designs to be done first." So every floor's level comes before any floor's enemies; this is
floor 8's, from the plan (`MD/FLOORS_7_10_PLAN.md`). Play it from the Lab: F8 → Floor 8 (the bottom row).

## The look
- Floor 3's stone **sooty grey** under a pale smoky sky, warmed from below by its lava; the paving a lighter grey so
  the iron's black and the lava's orange stand out on it. Embers and ash rising in the air.
- **Iron machinery** of its own (made in code): presses, fire vents, belts.
- **Swords hung on the walls** (their rack 1.8× as it comes, to read across a room), **workbenches** (a table with
  glowing ore or gold ingots on it), barrels, buckets and ore along the walls; torches still burn. Crates for low cover.
- **Lava pits** again, wider than floors 1–2's.

## Presses
- Crusher cells side by side are one press: an iron frame (a post at each corner, solid; beams round its top), a
  piston, and a hammer of dark iron between the posts, over an iron plate striped at its edge.
- Each **hangs** (1.4 s), **clanks and shudders** (0.6 s: its shadow spreads on the plate under it), **drops**
  (0.16 s), **rests** on the floor (0.45 s) and **rises** (1.2 s). The presses of a room go one after another (a wave
  across the room).
- **Landing on you: 40**, and you're thrown out from under it. **On an enemy: 150** (most are crushed: lure them under).
- Down (and low as it rises) it's **in the way**: you and enemies are pushed off it.
- "A press" on the death screen.

## Fire vents
- An iron grate on the floor. Each **idles** (2.2 s), **sputters** (0.8 s: its slits glow and flicker, a hiss), then
  **jets fire** 4 m up (1.3 s). The vents of a room go in waves across it.
- In the jet: **15** to you, once a jet, and you're **thrown up** out of it; **40** to an enemy in it.
- "A fire vent" on the death screen.

## Belts
- Belts of dark slats running the way their chevrons point; they **carry you** (2.6 m/s: you can walk against them),
  **enemies and bodies**. Some run into lava pits; some run in rings.
- Turned and mirrored with their room, a ring of belts stays a ring.

## All of it
- Runs all the time; **holds still while an execution, a grab or a pin holds the world** (and while paused).
- Its sounds and jolts only for what's near you (a press within 14 m, a vent within 10 m).

## Its rooms (nine, floor 8 only)
Smelting hall (presses in rows, a pool of molten metal in the middle), belt loop (a ring of belts round the room),
lava crossing (islands joined by narrow bridges), bellows (a field of vents going off in waves), foundry line (belts
running in from the walls to pits in the middle, a press over each line), workshop (rows of workbenches, vents, small
presses), great press (one 8 m press in the middle, columns, lava in the corners), furnace (a lava pool ringed by a
turning belt), press gallery (single presses down a turning walk, vents between).

## For now (stand-ins)
- **Enemies:** floor 7's stand-ins (dry-land ones from the floors before). **Boss:** the Velociraptor.

## The Lab (F8)
The designer, on the panel: "always put a new floor there" (the middle of its bottom row), "put page 1 & 2 instead of
stacking them together".
- **A new floor** (one with nothing of its own to list yet: 7, 8) is a button in the middle of the bottom row, on every
  tab: Floor 7, Floor 8.
- **The floors' columns three to a page** (Page 1: floors 1–3, Page 2: 4–6, under them), wide enough for every name,
  Play and the boss's Room; the page picked last kept. The body 16 px taller for the pages.

## Knobs (F1 → The Forge)
Press hang 1.4, warning 0.6, drop 0.16, rest 0.45, rise 1.2, height 4, wave 0.3, damage 40, on enemies 150; vent idle
2.2, warning 0.8, jet 1.3, wave 0.25, height 4, damage 15, on enemies 40; belt speed 2.6. **(placeholder numbers)**

## What was built
`world/dungeon/forgeRooms.ts` (the rooms; `mirrored` and `pinwheel`, the arrows turning with them), `forge.ts` (the
presses, vents and belts as laid out, the posts, the workbenches), `rooms.ts` (H, V, > < v A, k; a belt's way turned
and mirrored with the room), `styles.ts` (`FORGE_LOOK`; the look's types moved to `styleTypes.ts`), `assemble.ts`
(the boss room's start moved to `bossWalls.ts`), `ownDressing.ts`; `sim/dungeon/machinery.ts`, `roomLoop.ts`;
`sim/combat/events7.ts` (floors 7–8's events, the icicles' moved there), `player/state.ts` (the causes),
`screens/deathText.ts`; `tuning/forge.ts`; `engine/forge/pressView.ts`, `ventView.ts`, `beltView.ts`,
`engine/depthsView.ts` (floors 7–8's views together, out of `dungeonView.ts`), `motesView.ts` (embers),
`combatFeedback.ts`, `audio/soundLayers.ts`, `impactSounds.ts` (made in code); `screens/labLists.ts`, `LabPanel.tsx`,
`ui/theme/theme-19-lab.css` (the new floors, the pages); `styleTypes.ts`, `dressing.ts` (a look's `decorScale`);
`tools/blender/export_dungeon_kit.py` (the small table, the
swords' wall mount, ingots, ore into `kit.glb`), `tools/dungeon-shots.ts`, `tools/blender/render_dungeon.py` (its
boxes made quickly). Tests: `test-floor8.ts`, `test-lab.ts`.

## Fixed: floor 8 froze
The designer: "Floor 8 is frozen and crashes the entire GAME" (the console: `Cannot read properties of undefined
(reading 'length')` at `renderer.render`, every frame). The RPG pack's ore came into the dungeon kit with shape keys;
the game draws the kit's pieces instanced, and three.js threw drawing an instanced piece with morph targets. The kit's
export now takes every piece's shape keys off; `test-floor8` checks no kit piece has morph targets.

## Unseen in the game
Rendered in Blender (the rooms, the machinery as blocks): the first pass, warm stone under an amber sky, read as sandy
as the desert, so the stone went sooty grey and the sky pale; the wall swords were too small to see, so they're
bigger. To see in the game: the presses' and vents' timing, the
belts' pull (and which way they scroll), the fire, how hard it is to fight among them.

# Update 0.3.17 — floor 8 reworked: the Moon (its level)

Status: built (2026-11-02). The plan's update 1 (`MD/FLOOR8_MOON_PLAN.md`). The designer: "BIG REWORK of FLOOR 8 …
Sci-fi / moon theme floor theme, space sky so we are in the theme with the planet earth that can be seen from afar …
moon gravity … Moon themed levels". Decided with the designer: the Forge leaves floor 8, moon gravity "Floaty". The
enemies (the tiny ships, the aliens, the four mechs and their pilots) and the boss come next (0.3.18, 0.3.19).

## The look
- **A space sky**: black, with 1600 stars, **the Earth hanging large in it** (the Space Kit's Planet_1, turning
  slowly), a **ringed planet** far off (Planet_7), and **the sun**, a white disc with a glow where the light comes from.
  All of it stays round you at the edge of what's drawn, untouched by the haze.
- **Bright all the same** (the designer's rule): a hard white sun and white sky light on pale grey moon dust; the haze
  far off pale grey, not black. Only the sky overhead is black.
- **Moon dust on every floor cell**, its shades varying; the walls the dungeon's stone made pale moon grey (crater rims),
  rubble patches on them. **No torches** (no air for a flame).
- **Moon dust motes** hanging in the light, barely sinking.
- The Space Kit's pieces keep their own palette (Atlas_Moon). Its rocks are Mars-brown, so they're the **meteorites**;
  the moon's **boulders** are the Nature pack's rock, grey in the moon's light.

## Moon gravity
- **Gravity 0.625 of the usual** (F1 → Moon → Moon gravity): your jump keeps its speed, so it goes **1.6 times as
  high** and hangs longer; dashes and wall runs feel it too. **Knocked enemies and bodies fall slower** (more launches,
  splats and pins). Only on the moon.

## Meteor showers
- In three rooms (crater field, earthrise, meteor plain), while they fight, **a meteor is called down about every
  3.5 s** where you'll be. Its **shadow grows** on the dust and it **comes down out of the sky on a slant, glowing**
  (1.3 s); it strikes: **20 to you** and you're **thrown**; **60 to an enemy** near it, thrown too. Its **scorch mark**
  stays. "A meteor" on the death screen. (F1 → Moon: every number.)

## Its rooms (nine, floor 8 only)
The Landing Site (the lander in the middle, landing pads, a rover), Crater Field (craters, a great one with its
meteorite; meteors), Moon Base (modules along its lanes), The Greenhouse (domes, beds of soil with alien plants and
trees: the only place anything grows), Solar Farm (rows of panels), Rover Depot (rovers in bays, a raised loading bay),
Radar Ridge (high rock with radar dishes and antennas), Earthrise (an open rim; meteors), Meteor Plain (open dust, small
craters; meteors). Every door, spawn and chest spot joined in each. The landing pads throw you far higher in the low
gravity: onto the roofs.

## The Forge
Leaves floor 8 (the designer's choice). Its rooms, look and machinery move to floor 10 (unbuilt, not in the run), kept for
floor 10's echo rooms; its tests with it (`test-forge.ts`).

## What was built
`world/dungeon/moonRooms.ts` (the rooms), `moon.ts` (set pieces, craters, beds, dishes), `rooms.ts` (c f y O d u s q;
`meteors`), `styles.ts` (`MOON_LOOK`; floor 8 the Moon, 9 on the Forge), `styleTypes.ts` (`space`, `haze`,
`lowGravity`), `assemble.ts` (`level.moon`), `ownDressing.ts`, `dressExtras.ts`, `dressing.ts` (no torches in space),
`forgeRooms.ts` (floor 10); `sim/dungeon/meteors.ts`, `roomLoop.ts`; `sim/player/state.ts` (`gravity`), `step.ts`,
`dash.ts`, `wallRun.ts`; `sim/enemies/tick.ts`, `update.ts`, `enemy.ts`, `sim/combat/state.ts` (the fight's
`gravity`), `events7.ts`; `screens/deathText.ts`; `tuning/moon.ts`, `store.ts`; `engine/moon/spaceSky.ts`,
`moonView.ts` (craters, meteors), `depthsView.ts`, `dungeonView.ts` (the haze's own colour), `motesView.ts`,
`depthsFeedback.ts`, `run.ts` (moon gravity); `audio/impactSounds.ts`; `tools/blender/export_dungeon_kit.py`
(`--moon`: the Space Kit's pieces into `kit.glb`, one palette a pack), `tools/dungeon-shots.ts`. Tests:
`test-floor8.ts` (the Moon, new), `test-forge.ts` (was `test-floor8.ts`).

## Checked without a browser
Rules (tests): the look, the rooms joined, set pieces, plants only in beds, no torches, every piece in the kit, the
sky's parts, the jump 1.6 times as high and longer, bodies falling slower, the meteors' warning, strike, throw and
mark. Rendered in Blender (`dungeon-shots.ts` floor 8, `render_dungeon.py`): the rooms with the kit's pieces (the
renders' sky is Blender's stand-in, not the black sky; the craters' dishes and the meteors are the game's own).
**Not yet seen in the game**: the space sky, the light, moon gravity's feel, the meteors.

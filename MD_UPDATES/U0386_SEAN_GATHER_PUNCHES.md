# Update 0.3.86 — Gravity Sean: Grab gathers rocks, and punches with shockwaves

Status: built (2026-11-06), not played. The designer:

> Normal mode
> * rmb when holding gather more rocks up to 5 sec, you see rocks being gathered from random close area in the room and makes the attack bigger
> * More details on the punches on Lmb, more effects of shockwaves

## Grab, held (`sim/combat/gravityGrab.ts`)
1. **Pressed:** it takes a pillar or a chunk of floor, as before.
2. **Held:** every 0.5 s a rock tears out of the floor somewhere random around you, 4 to 11 m off, never through a wall, leaving a small crater. It flies up in an arc and joins the mass in 0.45 s, staying on it as a lump. The mass grows. After 5 s it's full: ten rocks.
3. **Let go:** it's thrown.

**This replaces the bible's "RMB again to throw"**, my call: it's now the same rule as Black Hole on right click in Unstable mode (hold, let go), so he has one rule for right click. A tap takes a piece and throws it as soon as it's up. Say if you'd rather have it back as it was.

| | A chunk | A pillar | Full (either) |
|---|---|---|---|
| What it hits takes | 30 | 80 | +240 |
| Burst | none | 3.5 m, 30 | 8 m, 130 |
| Speed | 36 m/s | 20 m/s | 18 m/s |
| Radius | 0.38 m | 0.85 m | 1.9 m |

- **The shield still works**, and grows: it stops what's coming at you, in front of you, whatever height the mass is drawn at.
- **It keeps your aim clear.** At full size it hangs further off and higher, so your crosshair sits just under it. Rendered at 68° and at 100° vertical: all of it on screen, aim clear. The first try hid half the view.
- Each extra crater is 0.55 m rather than the first chunk's 1.1 m: rendered, the bigger ones swallowed the floor close to you. The floor keeps its newest 24.
- From three rocks on it takes both his hands.
- Let go with a rock on its way, and that rock falls apart. Go Unstable, and all of it does.

## Gravity Punch (`engine/sean/punchView.ts`, `viewmodel/gravityArms.ts`)
**On his arm:** the pebbles on that forearm are flung outward along it and settle, its rings swell, and a ring leaves his knuckles.

**In the world, each punch:** a tube of pressure from the fist that threw it to where it ended, three rings running down it, staggered and growing, a flash at the fist, and a small kick in the view.

**Where any blow lands (the Fists too):** a flash, a quick white ring and a slower one spreading from it, facing you, with sparks.

**The combo's third:** twice the rings and bigger, a harder kick and some shake, and a rule change to go with the look: **it throws a little shockwave where it ends**, 2.5 m, 5 damage, knock 7 (F1: 0 turns it off).

## Also from the renders (`tools/sean-world-shots.ts`)
A new tool: his moves in a plain world, through the game's own views and rules, as plain meshes, to check sizes and what they hide.
- A flash at the fist filled the view: much smaller now.
- A thrown Black Hole's disk was out of scale in flight: smaller till it opens.
- **The Meteor came down out of sight**, from a fixed spot in the sky: it now comes from beyond the zone, as you see it.

## Still placeholders
Every number (F1, Gravity Sean), the sounds, the look. Not played by me. Glow doesn't show in those renders: they show size and place, not light.

## Tests
`tests/test-sean-grab.ts` rewritten for hold and let go, a deliberate change as the design changed, with the gathering added; `tests/test-sean-moves.ts` adds the punches.

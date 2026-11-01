# Update 0.2.27 — the enemies' shots (the graphics update, part 2)

Status: built (2026-11-01). The designer: "better uses of assets instead of having balls as projectiles"; the plan
(`PLAN_GRAPHICS.md`), part 2; the designer: "Yes, the shots".

## What you see
- **Fireballs** (the Dragon's, biggest; the Demon's; a Dragonling's, smaller; the Lab turret's): a white-hot core in
  two shells of flame that flicker and turn, **embers rising** behind them, and where one ends a **puff of flame** and
  a burst of sparks. **The Blue Demon's are blue.**
- **The Spitter's acid:** a glossy green glob that wobbles, **dripping** as it flies; where it lands a green splash and
  **a stain on the floor** (8 s; it shows with Blood off too: it isn't blood).
- **The Glubs' water:** a bolt drawn out along its flight, a mist behind it, spray where it lands.
- **A Tribal's spear** (a wooden shaft, a steel point), **a Cactoro's thorn**, **a Mask Tribal's feather** (white,
  red-tipped, fluttering, shedding down), **a White Rabbit's carrot** (leaves and all, tumbling end over end): each
  pointed along its flight, splinters where it ends.

## How
Made in code (no art): spheres and shells for fire, acid and water, cylinders and cones for the rest, small glowing
boxes for the embers, drips and splinters. The sim is unchanged: the shots' events don't say which shot ended, so each
of the 24 shot slots is watched (one gone, or fired again, ended where it last was). The balls and sticks
(`targetsView.ts`) are gone.

## What was built
`engine/shotLooks.ts` (each style, its meshes, its trail and burst), `engine/shotsView.ts` (in flight, trails,
bursts), `bloodFx.ts` (`stain`), `combatScene.ts`, `targetsView.ts` (the shots taken out). Tests: `test-shots.ts`.

## Unseen in the game
Checked by tests only: how the shapes read at speed, the flame's flicker, the trails' amount, the colours.

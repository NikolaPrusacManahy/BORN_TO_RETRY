# Update 0.2.26 — blood (the graphics update, part 1)

Status: built (2026-11-01). The designer: "let's plan a new visual update for enemies, like blood splashes …"; the plan
(`PLAN_GRAPHICS.md`) put blood and hits first; the designer chose **"Red, plentiful"**.

## What you see
- **Every hit on an enemy sprays its blood**, away from you, more the harder the hit (a jab about 15 drops, a heavy or
  a thrown weapon up to 30). The drops fly, fall and **splat on the floor**.
- **A kill bursts** (44 drops) and leaves **a pool** spreading under the body. An execution's blows spray, and its end
  bursts with pools all round.
- **Splats lie 40 s**, then shrink away; at most 260 at once (the oldest go first).
- **Each enemy bleeds its own:** red (flesh: grunts, demons, frogs, fish…), **green ichor** (slimes, spitters, wasps,
  spiders, blobs, Glubs), **bone chips** that lie a moment (skeletons, the Bone King, Skull Wraiths), **spores** rising
  (Mushnubs), a **pale mist** (the Wraith, the Hywirl), **amber sap** (Cactoros), **dark ink** (squid, jellies, urchins).
- **Under water** (floor 6, the Drowned King's flood) it bleeds a cloud that drifts up and fades.
- A bleed's tick (a Fate Card's) drips; a card's blast or lightning sprays a little.
- **Options → Blood: On / Less / Off.** Less: about a third, no pools, splats gone in 14 s. Off: none.

## How
Made in code (no art): small wet boxes for the drops (stretched along their flight), a splat drawn on a canvas, tinted
per enemy. The hit events carry only the point: the enemy is the one whose body the point is on (a hit on a dummy or a
hive bleeds nothing). Pools and splats lie on the floor an enemy stands on (a perch's top for one up there).

## What was built
`engine/bloodLooks.ts` (each kind's blood, the amounts), `engine/bloodFx.ts` (drops, splats, pools), `combatScene.ts`,
`state/settings.ts` (`blood`), `screens/SettingsFields.tsx` and `theme-37-options.css` (the choice), `App.tsx`,
`main.tsx`. Tests: `test-blood.ts`.

## Unseen in the game
Checked by tests only: how the sprays and pools look and read in play, the colours, whether 260 splats cost frame rate.

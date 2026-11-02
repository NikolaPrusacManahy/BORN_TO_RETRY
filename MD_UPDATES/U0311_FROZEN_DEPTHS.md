# Update 0.3.11 — floor 7, Frozen Depths: its level (enemies and boss next); floor 6 in the run

Status: built (2026-11-02). The designer, on the plan for floors 7–10 (`MD/FLOORS_7_10_PLAN.md`): "Go with it". As
with floor 6, the level and its look come first; its enemies and its boss (the Frost Roc) are next, to be designed
with the designer once it's been seen.

## Floor 6 in the run
The run now ends at **floor 6's** way down (it ended at floor 5). It moves to each new floor as that floor is done, up
to 10.

## The look
- Floor 3's stone **frosted white and ice-blue** under a pale winter sky, a white-blue haze, falling snow.
- **Snowy trees** (pines, birches, common and dead trees from the Nature pack's snow set) growing out of **beds of
  snow**, never paving; beds of snow with stumps, rocks, bushes or a log now and then.
- **Snowy rocks** for low cover; **crystal clusters** glowing ice-blue; torches still burn.
- **Sheets of ice** on the floor: glassy pale blue, white streaks and cracks frozen in them.

## The ice
- On a sheet of ice your **grip is 15%** of stone's: speeding up, turning, stopping and the extra speed of a dash or a
  slide bleeding off all take that much longer. What you start keeps going.
- A body **knocked across ice slides far** (an enemy you punch, a body you fling): more wall-splats and pins.

## Icicles
- They hang along the walls of every fight room, under the caps (never by a door).
- Come under one and it **shakes** (a creak, its shadow appearing on the floor), then **falls** straight down after
  0.7 s; its shadow grows as it comes. Where it lands it **hurts you (20)** and any enemy within 1.1 m, and shatters.
  Each falls once. Step out from under it as it shakes and it misses.
- "An icicle" on the death screen.

## Its rooms (nine, floor 7 only)
Frozen courtyard (a frozen pond in the middle, pines round it), ice lake hall (a colonnade round a lake of ice), crystal
cavern, snowed-in chapel (columns, drifts, a frozen aisle), pine wood, the long ice (a lane of ice from door to door),
glacier ring (a raised floor ringed by ice), dead grove, frozen lanes (lanes of ice with rocks on them). Floor 6's rooms
stop at floor 6.

## For now (stand-ins)
- **Enemies:** dry-land ones from the floors before (Skeleton, White Rabbit, Leaper, Tribal, Dino, Skull Wraith,
  Dragonling; the Yeti and the Ninja as mini bosses), till floor 7's own are designed.
- **Boss:** the Velociraptor, till the Frost Roc is made.

## In the Lab (F8)
The designer: "F8 command please". The Lab's panel has a **Floor 7** column with its **Play** (a run from its start;
its way down wins, as the last floor's). Its column lists no enemies yet (its stand-ins are under their own floors) and
no boss (the Velociraptor is under floor 4). The seven columns sit a little closer to fit.

## Knobs (F1 → Frozen Depths)
Ice grip 0.15, Ice slide 1.2/s, Icicle trigger 1.6 m, Icicle warning 0.7 s, Icicle height 5.3 m, Icicle damage 20,
Icicle reach 1.1 m. **(placeholder numbers)**

## What was built
`world/dungeon/frozenRooms.ts` (the rooms), `frozen.ts` (where icicles hang, the snowy dressing), `rooms.ts` (I, F, n),
`styles.ts` (`FROZEN_LOOK`), `assemble.ts` (the ice, the trees' trunks, the icicles; the columns moved to
`columns.ts`), `ownDressing.ts`, `dressExtras.ts`, `sunkenRooms.ts` (floor 6 only); `sim/dungeon/icicles.ts`,
`quicksand.ts` (`iceGrip`, `onIce`), `player/ground.ts`, `slide.ts`, `step.ts`, `state.ts` (`grip`, the cause),
`enemies/flight.ts`, `tick.ts`, `update.ts` (a body on ice), `roomLoop.ts`, `wavePlan.ts` and `kinds.ts` (the
stand-ins), `tuning/frozen.ts`; `engine/iceView.ts`, `icicleView.ts`, `dungeonView.ts`, `motesView.ts` (snow),
`combatFeedback.ts`, `audio/soundLayers.ts`, `impactSounds.ts`, `engine/runLinks.ts` (floor 6 the last for now);
`tools/blender/export_dungeon_kit.py` (the snow set into `kit.glb`), `tools/dungeon-shots.ts`; the Lab's floor 7:
`screens/labLists.ts`, `LabPanel.tsx`, `ui/theme/theme-19-lab.css`, `engine/gameBase.ts`. Tests: `test-floor7.ts`,
`test-lab.ts`.

## Unseen in the game
Rendered in Blender (the rooms, the snow, the trees, the ice); to see in the game: how the ice feels to fight on, the
icicles' timing, the falling snow, the ice's gloss in the game's light.

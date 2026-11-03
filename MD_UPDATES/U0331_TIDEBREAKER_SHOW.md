# Update 0.3.31 — Tidebreaker's show: the floor and space blown apart, its arena twice the size, the meteor

Status: built (2026-11-03). The designer: "Intro cinematic for the boss * All previous rooms explode and all of space *
The boss room is x2 bigger than a normal boss room, you see it expanding * A shot of the earth shakes and explode * A
meteor is coming from the earth exploding as it has at least 2 different camera angler as it lands on the arena with
a massive explosion, revealing the boss doing the monster transformation animation as the whole place shakes and name
displayed in slow motion like the shark boss" (with a screenshot of UAL 2's MonsterTransformation).

## What changed
- **Its arena is twice a boss room:** 120 m across (60 × 60 cells), twenty-eight pillars in three rings, cover, pads.
  The board grew to fit one room that big; the world's middle stayed where it was, so every other floor's rooms stand
  exactly where they did (checked).
- **Its show, about 16 s:**
  1. The view pulls up off you.
  2. **The floor's other rooms blow up one after another, the furthest first**, rolling in toward the arena. Each one
     gets a fireball swelling out of it, a shock running along its floor and fire rising. **Every piece of it** (walls,
     floor, props, craters, pads, signs, gates' bars, chests, the shop's wares) is flung up and out, turning, and
     shrinks away into space. The view circles high over the whole floor.
  3. **All of space with it:** bursts flare all over the sky, and the ringed planet bursts among them.
  4. **The arena expands:** the view swings high over it as its walls slide out to a normal boss room's size, hold,
     then slide on out to twice that.
  5. **The Earth:** the view cuts down into the arena looking up at it. It shakes harder and harder, glowing hotter,
     then bursts: a white flash, a ring of fire racing out, its pieces flung out burning. They cool into a field of
     rock where it hung, and stay that way for the rest of the floor.
  6. **The meteor** comes out of the burst.
     - **Angle 1:** close behind it as it falls.
     - **Angle 2:** from the arena's floor, looking up as it comes down.
  7. **It strikes the arena's middle:** the screen goes white, then a fireball and a shock ring race out over the
     arena. Its own crater, dust and rock are the biggest yet, and the whole place shakes.
  8. **Tidebreaker rises out of the crater doing its MonsterTransformation.** The view is low in front of it, with the
     boss on the left and its name on the right, **in slow motion** (as the Big Shark's), still shaking.
  9. The view comes back into your eyes, facing it, and the fight starts.
- **The way back is gone:** after the fight only the wooden gate opens (the way down). The doors you came in by stay
  shut, since the rooms behind them no longer exist.
- Booms for each room, the walls grinding, the Earth's rumble and burst, the meteor's roar and its landing (made in
  code).
- Knobs (F1 → Tidebreaker, the six named "Show: …"): how long the rooms blow, the walls slide, the Earth, the meteor's fall, the reveal,
  and the slow motion's speed.

## What was built
- **Arena:** `world/dungeon/floorPlan.ts` (`BIG_ROOM`, `boardAt`), `moonRooms.ts` (the crater), `bossWalls.ts`
  (`bossMid`), `assemble.ts` (`mid`). The places that still worked out a cell from the board's old size now use the
  board's middle: the Forge's belts and cells (`forge.ts`) and the map's you-are-here (`engine/overlayFeed.ts`); the
  floor 6, 7 and Forge tests caught them.
- **Sim:** `sim/dungeon/tideShow.ts` (new: the beats, the blast order, the meteor's landing, its rise, the slow
  motion), `bossBeats.ts` (new: out of `bossRoom.ts`), `bossRoom.ts`, `roomLoop.ts`, `sim/combat/eventsMoon.ts`,
  `tuning/tidebreaker.ts`.
- **View:**
  - `engine/boss/shell.ts` (two stages), `boss/tideCinema.ts` (new: the shots), `boss/bossShow.ts`.
  - `engine/moon/floorBlast.ts` (new: the pieces flung away), `moon/tideShowView.ts` (new: fireballs, the meteor, its
    landing), `moon/skyShow.ts` (new), `spaceSky.ts`, `moonView.ts`, `tideImpact.ts`, `tideLook.ts`.
  - `depthsView.ts`, `dungeonView.ts` (the haze pushed out for the wide shots), `kitMaterial.ts` (out of
    `dungeonView.ts`), `treasureView.ts`, `level.ts`, `run.ts`, `depthsFeedback.ts`.
- **Sound:** `audio/moonSounds.ts`.
- **Tests:**
  - `test-tidebreaker-show.ts`: the arena's size and the other floors unchanged, the beats, the event order, the rise,
    the slow motion, the gates after.
  - `test-tidebreaker-show-view.ts`: on the real kit, every one of the floor's 11,594 pieces outside the arena gone and
    the arena's 707 untouched; the furthest room first; the haze; the sky, the Earth and its field of rock; the
    meteor's path; every shot framed; the walls' two stages.
  - `test-floor8.ts`, `test-tidebreaker.ts`: 28 pillars.

## Checked without a browser
The tests above check, by geometry, that every room is in view while they blow, the whole arena is in view as it grows,
the Earth fills the arena shot, the meteor stays in view in both angles, the boss is on the left of the view (the name
on the right) and no shot ends up inside a pillar. **Not yet seen in the game:** how it looks and feels (the fireballs,
the flash, the speeds, the shake, the sounds).

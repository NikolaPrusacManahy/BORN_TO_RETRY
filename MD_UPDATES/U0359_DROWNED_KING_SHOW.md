# Update 0.3.59 — The Drowned King's intro

Status: built (2026-11-06). The designer: "do floor 5, 6, 7 & 10 * Arena / Moves / Intro". Every boss its own, at Tidebreaker's quality.

## The show (`sim/dungeon/drownedShow.ts`, `engine/temple/drownedCinema.ts`, `templeView.ts`)
About 12 s as you see it. SPACE skips it.

1. **The walls weep.** The view lifts off your eyes in a dry temple. A trickle down the walls.
2. **The walls burst.** High over the room: water falling down all four walls, which go back as the water comes up to your knees.
3. **Its fin.** Down on the water, turning to follow it: a great fin cuts the surface and goes three quarters of the way round, speeding up, then disappears: what you'll have to read in the fight.
4. **The crown.** A moment's silence. Close and low in its middle, a crown comes slowly up out of the water and stops.
5. **It bursts up.** All of it, arms wide, and it hangs: slowed, on the left of the view, its name on the right.
6. **It lands.** A wave rolls out under the view.
7. **Its heads snap at you,** twice: its tell, shown. Back into your eyes, facing it, and the first thing it does is launch them.

Tuning is in F1 → Drowned King, "Show:".

## Also
- A fin is now a fin shape, not a four-sided cone (all of floor 5's).
- `ShowDust` can be wet: pale spray and no rocks.
- `boss-shots.ts --beat=show-high|show-fin|show-crown|show-hang|show-land|show-snap`.

## Placeholders
- The show's sounds are code-made, plus the library's roar and crash.

## Files
- **New:** `sim/dungeon/drownedShow.ts`, `engine/temple/drownedCinema.ts`, `tests/test-drowned-show.ts`.
- **Changed:** `sim/dungeon/bossRoom.ts`, `bossBeats.ts`; `sim/enemies/drownedKingMoves.ts`; `sim/combat/events5.ts`; `tuning/drowned.ts`; `engine/temple/templeView.ts`, `drownedPose.ts`, `drownedHeads.ts`; `engine/boss/bossShow.ts`, `showViews.ts`; `engine/shrine/showDust.ts`; `engine/drownedFx.ts`, `drownedFeedback.ts`, `enemyLooks.ts`; `audio/drownedKingSounds.ts`; `tools/boss-shots.ts`; `tests/run-all.ts`.

## Unseen
- Not played. The shots were checked in Blender renders of the real camera positions and the game's own pose code.
- Those renders draw the King flat white and the water falling as opaque panels, so its look against the sky and the falls' real look haven't been seen.
- Not seen moving: the burst, the fin turning the view, the landing's wave.

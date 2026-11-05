# Update 0.3.57 — The Frost Roc's intro

Status: built (2026-11-05). The designer: "Next boss, floor 4 * Arena / moves / intro". Every boss its own, at Tidebreaker's quality.

## The show (`sim/dungeon/rocShow.ts`, `engine/norse/rocCinema.ts`, `plateauView.ts`)
About 11 s as you see it. SPACE skips it.

1. **The gale.** The view lifts off your eyes, snow blowing. High off the wall you came in by, the walls are forced back: peaks all round, the cliff, and a glacier in the middle of the plateau with something dark inside.
2. **Three thumps.** Low before the ice. The floor thumps, once, twice, three times, a ring rolling further each time and cracks glowing brighter in the ice. The Roc inside is tinted and frozen still.
3. **Its eyes.** Close on the glacier, as they open in the ice.
4. **It bursts out.** The ice flies everywhere and it goes up, wings wide, and hangs over the plateau. Slowed: it on the left of the view, its name on the right.
5. **The stomp.** Down in one stomp, its ring rolling out under the view: the one you'll have to jump.
6. **The scream.** Wings up, then back into your eyes, facing it, and the fight.

Tuning is in F1 → Frost Roc, "Show:".

## Also
- `boss-shots.ts --beat=show-high|show-low|show-eyes|show-burst|show-hang|show-land|show-scream`; `--noice` leaves the glacier out.

## Placeholders
- The show's sounds are code-made, plus the floor's existing ones.
- The dust and rock thrown up are the shared `ShowDust`, tan rather than snowy.

## Files
- **New:** `sim/dungeon/rocShow.ts`, `engine/norse/rocCinema.ts`, `tests/test-roc-show.ts`.
- **Changed:** `sim/dungeon/bossRoom.ts`, `bossBeats.ts`; `sim/combat/eventsNorse.ts`; `tuning/frostRoc.ts`; `engine/norse/plateauView.ts`, `rocPose.ts`; `engine/boss/bossShow.ts`, `showViews.ts`; `engine/enemyLooks.ts`, `depthsFeedback.ts`; `audio/norseSounds.ts`; `tools/boss-shots.ts`; `tests/run-all.ts`.

## Unseen
- Not played. The shots were checked in Blender renders of the real camera positions and the game's own pose code.
- Those renders draw the Roc flat white and the ice opaque, so these haven't been seen: the Roc through the ice, its eyes in it, the ice's look, the snow blowing, the frozen tint.
- Not seen moving: the burst, the hang, the stomp.

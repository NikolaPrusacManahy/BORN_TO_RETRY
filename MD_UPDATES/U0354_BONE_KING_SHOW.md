# Update 0.3.54 — The Bone King's intro

Status: built (2026-11-05). The designer: "just go next boss, arena / moves and intro". Every boss its own, at Tidebreaker's quality.

## The show (`sim/dungeon/kingShow.ts`, `engine/boss/kingCinema.ts`)
About 12 s as you see it. SPACE skips it.

1. **The floor trembles.** The view lifts off your eyes. High off the wall you came in by, the walls that shut you in are forced back, and the whole pit is there.
2. **The bones fly.** Loose bones all over the floor float up and stream to the middle. Down on the floor among them, a skeleton builds itself from the feet up, using the model's own spawn clip.
3. **It has no head.** It stands, massive and headless. Its skull lies on the floor in front of it, part of the real model, moved by its bone.
4. **It takes its skull.** It stoops, its arm reaches down, and it lifts the skull in its hand and sets it on its own neck, the view following up.
5. **Its eyes catch.** Slowed: its head on the left of the view, its name on the right, green fire catching in its sockets.
6. **The Arm Slam.** It roars, arms out, then raises its arm high and brings it down flat, the same move you'll have to read in the fight. The shock throws the spare bones back all over the pit, and the view comes back to you.

Tuning is in F1 → Bone King, "Show:".

## Also
- Its eyes now glow faintly in its first life, so they read as alive; brighter once rebuilt; full through its Colossus.
- `boss-shots.ts --beat=show-high|show-low|show-stoop|show-lift|show-eyes|show-roar|show-arm|show-down`.

## Placeholders
- The show's sounds are code-made, plus your existing clips.

## Files
- **New:** `sim/dungeon/kingShow.ts`, `engine/boss/kingCinema.ts`, `tests/test-king-show.ts`.
- **Changed:** `sim/dungeon/bossRoom.ts`, `bossBeats.ts`; `sim/combat/events.ts`; `sim/enemies/kingBody.ts`; `tuning/boneKing.ts`; `engine/boss/bossShow.ts`, `showViews.ts`, `kingPose.ts`, `kingView.ts`, `kingFeedback.ts`; `engine/enemiesView.ts`; `audio/kingSounds.ts`; `tools/boss-shots.ts`.

## Unseen
- Not played. The shots were checked in Blender renders of the real camera positions and the game's own pose code.
- Not seen moving: the bones' flight, the spawn clip's timing against it, the skull's hand-off, the shock.

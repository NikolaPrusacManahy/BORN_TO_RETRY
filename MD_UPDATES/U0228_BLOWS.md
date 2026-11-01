# Update 0.2.28 — your blows and the deaths (the graphics update, part 3)

Status: built (2026-11-01). The plan (`PLAN_GRAPHICS.md`), part 3; the designer: "Yes, part 3".

## What you see
- **A swing leaves an arc** across your view, sweeping on as it fades, each the other way to the last: silver for the
  sword, gold for the gold sword, the gold axe and the gold blades, a broad dusty sweep for a hammer, thin and quick
  for the daggers. (Not the book's or the pistol's.)
- **Where a punch lands, a ring of dust** bursts out facing you: a jab's small, a finisher's and a slam's wider, a
  heavy's widest (by its charge).
- **A hammer's smash throws rocks** (22, bouncing as they land) and rings of dust up off the floor, on top of its
  shockwave.
- **A hit squashes an enemy** a moment (wider and shorter, springing back).
- **The dead sink into the floor** before they go (over the last half of their time lying there), instead of vanishing.
  Not a boss, a flier or a fish (they have their own deaths).

## How
Made in code (no art): ring segments for the arcs (they ride with the camera), rings for the dust, small stones for
the rocks; the squash and the sinking in `enemiesView.ts`.

## What was built
`engine/blowsFx.ts`, `engine/enemiesView.ts` (`sinkOf`, the squash), `combatScene.ts`. Tests: `test-blows.ts`.

## Unseen in the game
Checked by tests only: the arcs' place and size in your view, how busy a fight looks with sparks, blood and dust
together, the squash's strength.

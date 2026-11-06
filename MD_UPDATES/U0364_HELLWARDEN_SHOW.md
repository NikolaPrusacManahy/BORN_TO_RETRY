# Update 0.3.64 — Hellwarden's intro

Status: built (2026-11-06). The designer: "do floor 5, 6, 7 & 10 * Arena / Moves / Intro". Every boss its own, at Tidebreaker's quality. From `MD/FLOOR10_HELL_PLAN.md`'s proposal.

## The show (`sim/dungeon/wardenShow.ts`, `engine/hell/wardenCinema.ts`, `throneView.ts`)
About 13 s as you see it. SPACE skips it.

1. **The void.** The view lifts off your eyes and goes high as the walls go back: the throne room floating in a void, its great throne past the far wall.
2. **The rift.** The floor splits along a line straight at you, lava rising in it, the room shaking.
3. **Its walk.** Low, at the rift's end, looking along it. It walks up out of the lava, step by step, carrying its sword.
4. **Its sword.** Close, as it stops and its sword catches fire.
5. **Its name.** Low, looking up as it raises it. Slowed: it on the left of the view, its name on the right.
6. **Its blow.** Down: a ring of fire rolling out under the view, the whole room heaving. The rift closes.
7. **Its roar.** Back into your eyes, facing it, and the fight.

Tuning is in F1 → Hellwarden, "Show:".

## Also
- `boss-shots.ts --beat=show-high|show-walk|show-sword|show-name|show-roar` for floor 10.

## Placeholders
- The show's sounds are code-made, plus the library's. Its dust is the shared `ShowDust`. Its rift is a plain lit strip of lava, made in code.

## Files
- **Changed:** `sim/dungeon/bossRoom.ts`, `bossBeats.ts`; `engine/boss/bossShow.ts`, `showViews.ts`; `tools/boss-shots.ts`; `tests/run-all.ts`.
- **New:** `tests/test-warden-show.ts`.

## Unseen
- Not played. The shots were checked in Blender renders of the real camera positions.
- Not seen moving: its walk up out of the rift, the blow, the rift closing.

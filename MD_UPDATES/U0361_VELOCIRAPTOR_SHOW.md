# Update 0.3.61 — The Velociraptor's intro

Status: built (2026-11-06). The designer: "do floor 5, 6, 7 & 10 * Arena / Moves / Intro". Every boss its own, at Tidebreaker's quality.

## The show (`sim/dungeon/dinoShow.ts`, `engine/boss/dinoCinema.ts`, `ruinsView.ts`)
About 11 s as you see it. SPACE skips it. It teaches its lesson before the first blow: listen.

1. **The ruins.** The view lifts off your eyes and goes high over the ruins as the walls go back, sand blowing. Nothing there.
2. **A click.** Low in the middle. A click, panned to one side. The view turns that way, and something crosses the far gap.
3. **Another click,** from the other side, nearer. The view turns: it crosses again.
4. **A hiss.** Close under the far wall, looking up: it's crouched on top, eyes burning.
5. **It leaps.** Off the wall, it hangs over you. Slowed: it on the left of the view, its name on the right.
6. **It lands** in the middle, sand flying in a ring.
7. **It roars.** Back into your eyes, facing it, and the fight.

Tuning is in F1 → Velociraptor, "Show:".

## Also
- `boss-shots.ts --beat=show-high|show-click|show-wall|show-hang|show-land|show-roar` for floor 6.

## Placeholders
- Its clicks and hiss are code-made; the library has the roar and the landing.
- The dust is the shared `ShowDust`.

## Files
- **New:** `engine/boss/dinoCinema.ts`, `tests/test-dino-show.ts`.
- **Changed:** `sim/dungeon/bossRoom.ts`, `bossBeats.ts`; `engine/boss/bossShow.ts`, `showViews.ts`; `tools/boss-shots.ts`; `tests/run-all.ts`.

## Unseen
- Not played or heard. The shots were checked in Blender renders of the real camera positions.
- Not seen moving: its runs across the gaps (they pass behind blocks of wall, so how much of it shows is the thing to check), the view turning, the leap.

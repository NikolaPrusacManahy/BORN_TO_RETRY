# Update 0.5.3 — the lobby keeps its shadows

Status: built (2026-11-07). The designer, after trying it: "Yes, calmer". The next changes below weren't needed. The designer:

> optimase the Lobby, my fans are wilding

## What it cost, measured
Counted with `tools/lobby-cost.ts` (new; no browser needed), and set against floor 1:

| | The lobby | Floor 1 (0.3.39) |
|---|---|---|
| Main pass | 3.53 M triangles, 295 draws. Nothing is left out by where you look: each kit piece is one instanced mesh across the whole manor | 1.8 M in view (drawn in 30 m squares) |
| Key light's shadow | 1.69 M triangles, 129 draws, every frame | — |
| Point lights | 18 (5 chandeliers, 8 torches, the hearth, the altar's glow, your character's, the crystal's, the Fate Cards' stand) | a few, moving from torch to torch |
| Frame rate | your cap, 144 at first (the menus stop at 60) | the same |

## The one change
**The key light's shadow map is kept.** Only the portcullis ever moves anything that casts into it. It's drawn when the manor's built, each frame while the portcullis rises, and when the Shadows knob (F1 → Lobby light) is turned. That's 1.69 M triangles and 129 draws a frame off, a third of what the lobby drew.

**The look doesn't change.** The figures' breathing (0.6% taller and back) still moves their own light but not their shadows, which nobody can see.

Floors are as they were: their shadows are drawn every frame.

## Not changed yet (one change at a time)
If the fans don't calm enough, these are next, one at a time, each checked before the next:
1. **The lobby drawn in squares,** as the floors are, so what's behind you isn't drawn: up to half of the 3.53 M.
2. **The lobby at 60 fps at most,** as the menus are.
3. **Fewer of its 18 point lights** at once. That one changes how it looks, so it's last.

## Tests
- **New:** `tests/test-lobby-perf.ts`. It checks when the shadows are drawn: built, five seconds standing, the portcullis rising and stopped, the knob. It also checks that the run draws them only then, and that floors' are drawn as ever.
- **No expected values changed.**

**Not measured:** the frame time on your PC. Please check the fans, and the F2 frame rate in the lobby and on floor 1 (the reference) against before.

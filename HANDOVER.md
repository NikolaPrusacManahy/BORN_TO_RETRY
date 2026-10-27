# HANDOVER.md — where things stand

Read `CLAUDE.md` first (kept on this PC only, never in the repo), then `MD/DESIGN.md`, then the current milestone plan.

## Current state (2026-10-27): Update 0.0.1
- **Milestone: M1 — The Feel Lab** (`MD_UPDATES/M1_FEEL_LAB.md`). **Build steps 1–5 are done**: scaffold, loop and platform, tuning system, arena, movement and camera.
- Next: step 6 (fists), step 7 (Grunt and Spitter), step 8 (hit feedback, health, HUD), step 9 (key rebinding screen), step 10 (docs).
- Game: RUINBREAKER (working title), a first-person action roguelike, solo, desktop browser. Steam later via Electron.
- Tech: Vite + React + TypeScript, Three.js 0.186, Rapier 0.21 (`@dimforge/rapier3d-compat`), Node 24.

## What to try in-game
Run `START_GAME.bat`, click to play.
- **Moves:** WASD, Space jump / wall jump, Shift dash (3 charges), C slide on the ground or slam in the air. Jump right after a slam landing to bounce.
- **Feel Lab spots:** the wall-jump shaft (west), the ramp up to the plateau (north-east), the drop tower with its jump pad (east), the 1.3 m tunnel you must slide through (east, leads onto the ramp), three steps (south-west).
- **Dev keys:** F1 (or `) tuning panel, F2 debug overlay, F3 back to start. Esc pauses: sensitivity, FOV, volume, fullscreen.
- **Tuning:** changes save in the browser. Export copies the changed values; paste them in the chat to make them the defaults.

## Changes from the M1 plan
- **Floating capsule:** Rapier's own step climbing only worked above ~6 m/s, so a player starting next to a step got stuck. The capsule now floats 0.4 m above the feet and a ground probe places the feet. Steps up to 0.4 m work at any speed (`DEVELOPMENT.md`, Contracts).
- The slide height is 1.2 m (it was planned as 1.0), so the floating capsule fits. The tunnel roof is 1.3 m.
- The tunnel sits just south of the ramp, so a slide through it carries onto the ramp.
- F3 puts you back at the start (it respawns enemies once they exist). F4 (invincibility) arrives with health.

## Files
| File | What it is |
|---|---|
| `MD/DESIGN.md` | The full game design, with placeholders marked |
| `MD_UPDATES/M1_FEEL_LAB.md` | M1 scope, starting values, build order, tests |
| `DEVELOPMENT.md` | Module map and contracts |
| `ASSETS/QUATERNIUS/` | Drop the downloaded Quaternius packs here, one folder per pack (git-ignored) |

## Git
- Commit titles are `Update X.Y.Z`, then a blank line and `- ` bullet lines. No co-author line.
- `CLAUDE.md`, `CLAUDE.local.md`, `.claude/` and the raw `ASSETS/` folder are git-ignored.

## Decisions made
- First person, solo only, no online features.
- Browser (Three.js + Rapier), not raylib or Godot. **Godot is the fallback** if M1 shows the browser can't deliver the feel.
- Arenas are hand-made templates assembled from a seed, not random geometry.
- Weapons break; breaking throws the weapon for a big hit.
- Only character unlocks and stats carry over between runs.

## Open questions waiting on the designer
1. The game's name.
2. The theme: dark ruins and monsters, or something else?
3. Firearms from the start, or melee only at first?
4. Boss ideas for floors 1–3.
5. The starter character and the unlock order.

## Browser checks (filled in during M1)
| Check | Result |
|---|---|
| Raw mouse input (`unadjustedMovement`) in Brave | — (F2 shows "raw mouse") |
| Keyboard lock captures Ctrl+W in fullscreen | — (pause menu shows "Keyboard lock") |
| F1 can be captured by the page | — |
| Steady frame time with 15 enemies | — (needs step 7) |

## Not verified
Nothing visual or audible has been seen or heard by Claude: the feel, the look, the sounds and the menus are unverified until played.

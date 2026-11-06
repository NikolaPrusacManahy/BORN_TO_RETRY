# Update 0.3.72 — the Demon's main moves (phase 2 of 5)

Status: built (2026-11-06). The designer: "Good, continue phase 2". From `enemy_bibles/Born to Retry — Playable Demon.docx`.

## What it does
| Key | Move | What it does | Numbers (all placeholders, F1's The Demon tab) |
|---|---|---|---|
| Left click, third hit | Blazing Arc's fire wall | The overhead leaves a short wall of fire across your way, on the floor | 3.5 m ahead, 7 m long, 2.5 s, 10 damage every 0.45 s |
| Hold left click | Ember Wave | Charges, then on release a swing throws a flaming crescent through everything in its line. Let go before it's full and it's called off. The Demon's only ranged attack | 0.34 s before it starts charging, 0.55 s to fill; 30 m/s, 26 m, 40 damage |
| Right click | Verdict Parry | Held, the blade is up: half of any blow is taken off and you move at 60%. In the parry window, a blow or shot parried answers with an instant counter-slash, and the world slows | Counter 70 damage, ±60°; world at 30% for 0.45 s; 1.5 s till the next parry |
| Shift | Hellfire Lunge | The dash becomes a thrust that goes through bodies and burns everything on its way, each once. Same 3 charges | 85 m/s for 0.13 s: 11 m, twice Joseph's 5.6 m; 30 damage |
| Ctrl, on the ground | Brand of Ruin | Plants the sword: lines of pillars erupt outward. You're rooted and untouchable for its moment, and pushed things go outwards: it's the way out when surrounded | 8 lines, 6 pillars each, 2 m apart; 34 damage, each thing once; rooted 0.4 s; 5 s wait |
| Ctrl, in the air | Plunge | Dives sword-first, and lands as a Brand: the higher the fall, the more lines, the longer, the harder | 6 lines × 4 at the lowest, 12 × 10 at 12 m past Slam's height; up to 70 damage |

**A change to 0.3.71, on purpose:** holding left click used to repeat the combo. The bible gives Hold to Ember Wave, so now each swing takes its own click. `test-blazing-arc.ts` was changed to match. A click made during a swing is kept for 0.28 s, so clicking along still chains.

## Where the bible left it open (my choices, to play and overrule)
- **The block's share and speed:** it says only "block with the sword". 50% and 60%.
- **The Lunge isn't a true teleport:** it's a very fast move, so walls and the floor still count and it can't end up inside something.
- **Brand's untouchable moment:** from "escape tool when surrounded".
- **A wait on Brand of Ruin (5 s):** without one, Ctrl is a free invulnerable screen-clear.
- **Holding right click and the counter:** the counter still fires with right click held.

## How it's built
- **The rules** (`sim/combat/`): `bladeSwing.ts` the swings and the hold, now five (slash, backslash, overhead, Ember Wave's, the counter), `demonMoves.ts` the Lunge, Brand and Plunge, `demonFire.ts` the wall, waves and pillars, `sweep.ts` what lies along a path. Joseph's dash, parry and slam are tested as unchanged.
- **The arms** (`viewmodel/demonPoses.ts`, `swordAnim.ts`): their own keys for Ember Wave, the counter, the block, the thrust and the plant. The block is held as long as you hold it; the plant as long as you dive, and lets go when you land.
- **The fire on screen** (`engine/demon/demonFireView.ts`), created only for the Demon.
- **The sounds** (`audio/demonSounds.ts`): the boss's recordings already in the game, with made noise under them. Nothing new, nothing AI. **Not heard by me.**

## The poses (rendered through the game's own arms)
| Moment | Wrist |
|---|---|
| Charging | 36° |
| Ember Wave | 15°, 36°, 36° |
| Block | 22° |
| Counter | 28°, 12°, 9° |
| Thrust | 17° |
| Plant | 22° |

The block stands over the crosshair, not on it, so you can still see. The thrust leaves no trail: the arms have their own frame, so a trail would only show the arm getting there, and it streaked upward when rendered. The plant runs the blade into the floor ahead with its tip in view, the pommel standing up out of the fist: it's on screen for a moment, or through a dive.

## Still open
- **Not seen moving or heard in the game**, by me: only frames, numbers and tests. The fire view's look (wall, crescent, pillars) has never been rendered in a room.
- Damage, ranges and timings are placeholders until phase 5's balance.
- Heat isn't in yet, so the bible's "bigger arcs, longer walls, Lunge leaves a burning trail" wait for phase 3, with Blade Throw, Last Verdict and heal on kill.
- Waiting on the designer: floor 10 in public runs (the unlock can't be earned there while it's closed), Victory lap or Demon Mode, HP 100 or lower.

## To try it
Lab → F8 → Items → Play as → The Demon. Numbers in F1's The Demon tab.

## Tests
`tests/test-demon-moves.ts`: each move's rules, Joseph's dash, parry and slam left as they were, the sim and the arms frame by frame, the fire view. `tests/test-blazing-arc.ts`: five swings; holding no longer repeats.

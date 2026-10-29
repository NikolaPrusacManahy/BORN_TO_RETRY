# Update 0.1.14 — the death screen

Status: built (2026-10-29), from the designer: the game's goal is 10 floors without dying; "you play, you lose, you learn,
you retry"; hard but doable with effort. Then "Death screen first" (Claude's proposal: to learn, a death has to tell you
what killed you and how far you got).

Before, dying in a run faded to black and dropped you straight into a new run: no word on what happened.

## The screen
- Dead in a run (a dungeon floor), the world slows and fades to black as before; once it's black, the death screen comes
  up over it and the mouse is freed. The world holds still behind it (no sounds go on).
- **Killed by** (small, dim), then what killed you, large in crimson: the enemy by its name in the game (the Yeti for the
  brute, The Demon, The Dragon), or the Turret, Spikes, Lava, The fall.
- **Floor**, **Time** (played since the run's start, m:ss; paused time and dying don't count) and **Kills** (enemies you
  killed in the run, executions too).
- **Retry** (focused: Enter works) starts a new run; **Menu** goes to the main menu. If the browser won't lock the mouse
  again at once, Retry opens the pause menu instead (its Resume locks it).
- Each line rises in, one after another. No hints or key labels (the designer's rule).
- **1.5× bigger** than first drawn (the designer, after a preview).
- In the Lab (the Feel Lab itself), dying still puts you straight back at its start.

## What killed you
- Every hurt says what did it: an enemy's own hit, its orbs, the Demon's quake rings, the Dragon's bombs; the turret,
  spikes, lava, the fall. Poison remembers who poisoned you, so dying of it later names the snake or the wasp.
- It's whatever last took your health (a hit your shield takes whole doesn't count).

## The loader (the same update)
The designer: "a little 1s loading screen after selecting a character with the same loop animation that is near the
game logo, just bottom right as the level loads".
- After Play on the character select and the fade to black, the logo's retry arrow turns bottom right on the black
  while the level is built, for at least 1 s, then fades out with the black. No words.
- Its turn is the logo arrow's (the same curve, about a second long), with a shorter rest between turns, so it turns at
  once rather than resting first (the logo's rests two seconds).
- The main menu's Lab and the death screen's Retry go in without it.

## (placeholders)
- The look (crimson, sizes, the rise), the words, which numbers show. The loader's second, size and place. Later: rooms cleared, the seed, a best run.

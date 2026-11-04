# Update 0.3.47 — runs end at floor 9 (the public playtest build)

Status: built (2026-11-04). The designer, before making a public build for a playtest: "no access to floor 10, access of
floor 1 to 9".

## What changed
- **A run ends after floor 9:** the Moon's way down, after Tidebreaker, shows "Run complete — Survived". It ended after
  floor 7 (Skull Cove) before.
  - Floors 8 (the Shrine Dimension, Okami) and 9 (the Moon, Tidebreaker) come in a run now, after floor 7's way down.
- **Floor 10 (Hell on Earth) can't be reached in the public build.** A run stops at 9, and the Lab (which starts any
  floor) is only in the dev build. Its files are in the build but unreachable.

## Checked for the public build
- **Hosting:** the build goes on Netlify, at the site's root. The models load from `/models/...` there; only a host
  putting the game in a subfolder (itch.io) would need relative paths. Sounds and music already use relative paths.
- **Dev tools:** off in a built game (F1 tuning, F3, F4, F7 capture, F8/F9 the Lab). F2 is the players' frame-rate
  counter (0.3.45).
- **Size:** 188 files, 95 MB.
- **The version:** in the main menu and in each Feedback report (0.3.46).

## Files
- `engine/runLinks.ts` (`LAST_FLOOR = FLOOR.moon`).
- Tests: `test-alpha.ts`, `test-floor3-executions.ts` (floor 9 the last).

## Unseen
- Not played: a run through floors 8 and 9 from the lobby (they were played from the Lab before), and the end screen
  after Tidebreaker.

# Update 0.3.36 — skip a boss's show; weapons held past their last use

Status: built (2026-11-03).

## Skip a boss's show (SPACE)
The designer: "Add a skip button while the Intro is played for any boss -> "SPACE" to skip".
- **What it does:** while any boss's show plays, press the jump key (SPACE by default) and the fight starts at once.
  This works for every boss: the portal bosses, the Big Shark, Tidebreaker and Okami.
- **How:** the show runs on to its end in a moment, every beat done, so everything is as the show would have left it:
  - the boss where it ends up (Okami where it lands, Tidebreaker out of its crater);
  - you where the show puts you (Okami's: facing it);
  - the floor's rooms gone, the arena grown, Okami's islands and temples in and solid;
  - you facing it, the view back in your eyes.
- **Silent:** the skipped show's sounds and shakes are dropped, so they don't all go off at once. What a show's view
  keeps for good still comes (Tidebreaker's crater).
- **The hint:** "SPACE skip" shows small in the bottom bar's right corner while a show plays (your jump key, if
  rebound), and is gone once the fight starts.

## Weapons held past their last use
A tester: "if you are holding attack and pick up a weapon you can use it infinitely as long as you hold click".
- **The cause:** at 0 uses a weapon is broken and your next attack throws it. That "next attack" was only ever a fresh
  click. With the click held down, the broken weapon kept swinging and its hits kept landing, at no uses, for as long
  as you held it. Picking a weapon up with the click already held was just the easy way to hit it: you never let go.
- **Now:**
  - a broken weapon with the click held is thrown, just as a fresh click throws it;
  - and a weapon is never swung at 0 uses.
- **Checked:** every weapon picked up with the click held.
  - Uses go down as hits land.
  - At 0 the sword and the daggers are thrown.
  - The pistol fires only on clicks, as before.

## What was built
- **Skip:**
  - Sim: `sim/dungeon/bossRoom.ts` (`skip`, the show run on).
  - Engine: `engine/run.ts` (the jump key during a show), `boss/bossShow.ts`, `hudStore.ts`, `overlayFeed.ts`.
  - Screen: `screens/BossHud.tsx`, `ui/theme/theme-15-boss.css`.
- **Weapons:** `sim/combat/step.ts`, `sim/weapons/swing.ts`.
- **Tests:**
  - `test-boss-skip.ts` (new): all nine bosses' shows skipped straight into their fights as the show leaves them, and
    the hint shown only during a show.
  - `test-sword.ts`: a sword picked up with the click held is thrown at 0 uses, never swung on.

## Checked without a browser
Both by tests. **Not yet tried in the game:** the skip key's feel, and the hint's place on screen.

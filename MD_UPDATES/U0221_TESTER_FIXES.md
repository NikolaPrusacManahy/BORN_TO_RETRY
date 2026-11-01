# Update 0.2.21 — the testers' fixes: the slam's hands, the chest's shot over lava, the HUD's size

Status: built (2026-11-01). From the testers' feedback the designer passed on ("Everything at once"); the slam spam and
the Fate Cards' builds are 0.2.22.

## The slam's hands stuck up
A tester: "Ground smash hands animations is stuck in the hands up starting animation when pressing ground smash and
pressing left mouse button when ground smashing".
- **The fists follow the slam.** They came up when a slam began and only came down on its landing; a slam that ended
  any other way (a dash, a wall jump, a jump pad, the water) never landed, so they stayed up till the next slam landed.
  Now a slam over without a landing lets them go back to the guard (as quickly as after a landing).
- **A click in a slam punches as you land.** Barehanded, the fists are clasped as you drop: they do nothing then (a
  jab used to go off unseen under the clasp; a charge you hold is kept, a cooldown waits). A click made as you drop is
  kept, and the jab goes off the tick you land. With a weapon, nothing changes (no clasp).

## Killed in lava by the chest's shot
A tester killed the last enemy, a flyer over a lava pit; the view went to the chest rising, and they fell into the lava
meanwhile (the shot took the view and the keys, but the world ran on).
- **The shot waits for the ground.** It begins once you're standing on something (not mid-jump, not falling); a chest
  that rose while you were in the air is shown as you land, if you land within **4 s**; later, it isn't shown at all.
- **The world holds still while it runs**, as for a deal: only the chest comes up out of the floor. You come back just
  where and how you were (your speed too).

## The HUD's size
The designer, to a tester: "next test build will have an adaptative UI scalling". The in-play HUD (health, money,
the weapon, keys, the map, the boss's bar, the meter, the counts) was drawn in fixed pixels: big in a small window,
small on a big screen.
- **The HUD is the same share of the screen at any size**, as it is at 1080p (720p: two thirds as big; 1440p: a third
  bigger). Counted in the screen's own pixels, so Windows' display scaling doesn't shrink it.
- **UI size** (Options → General, 70% – 140%, 100% at first, saved) on top of that.
- The menus keep their own fit to the window (they never scroll), as before.

## What was built
`sim/combat/step.ts`, `fists.ts` (the clasped fists, the kept click); `engine/viewmodel/slamArms.ts` (`follow`),
`viewmodel.ts`. `engine/chestShot.ts` (waits for the ground), `engine/run.ts` (the world held, the chest rising),
`sim/dungeon/treasure.ts` (`riseChests`). `ui/uiScale.ts` (`--rb-hud`), `state/settings.ts` (`uiSize`),
`SettingsFields.tsx`, `App.tsx`, `main.tsx`; the HUD's CSS (`theme-03-hud.css`: the HUD laid out at its size and
scaled; the enemy count, the map's chest note and the grab's prompt no longer sized by the window). Tests:
`test-slam-hands.ts`, `test-chest-pan.ts`, `test-hud-scale.ts`.

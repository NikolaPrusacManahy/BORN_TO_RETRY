# Update 0.3.1 — executions held where you are; punches and movement with more rush

Status: built (2026-11-01). The designer: "upgrade the gameplay feeling … the impact feel … the way throwing punches
feel … the dashes and sliding to be intense and fast and very adrenaline like … like Doom or Ultra kill"; "Yes start
work with punches and movements"; and, a real issue: "when in the air, player's body falls down and hands remain up,
looks terrible"; "when a flying enemy is up, we fall down and player execute the enemy off screen".

## Executions
- **Why:** an execution's moves are laid out from where you stood when you grabbed the enemy, but your body kept
  falling under gravity: in the air your hands (and the body) stayed up there while the view dropped with you; a flier
  was executed above the screen.
- **Now:** while you hold it, **you stay exactly where you grabbed it**, in the air too (no falling; a slide, a dash or
  a wall run you were in stops). The view turns to the moves as before, so they're always in front of you. Let go and
  you're free: you fall as normal.

## Punches
- **A freeze on every hit:** a jab's 25 ms (none before), a finisher's 70 ms (was 40), a charged punch's up to 120 ms
  (was 70), a kill's 90 ms (was 50).
- **Harder shakes and camera kicks** (a jab's kick 1.1°, was 0.6; a charged punch's 3°, was 1.8).
- **More knockback:** a finisher's 11 m/s (was 8), a charged punch's 26 m/s (was 20).
- **A deep thump under every blow that lands** (a jab's light, a heavy's heavier, a kill's deepest with a crack), over
  whatever the blow's own sound is.

## Movement
- **The dash:** 40 m/s for 0.14 s (was 30 for 0.18: about as far, much snappier), 17 m/s kept out of it (was 14). (A
  rush of air under its sound was tried, and taken out: the designer, "remove the rush of air".)
- **The slide:** 22 m/s (was 16), lasting while you hold it (1.5 s at most; was 0.5).
- **The view widens more:** 14° in a dash (was 8), up to 16° at speed (was 10).
- **Speed lines:** streaks flowing out past the edges of your view, some in a slide, all of them in a dash, fading as
  you slow (fewer on Effects: low).

## The punches' and kills' sounds, layer by layer
- The designer: "there is one sound that I hate on the punches, show me the sounds in sounds on F8 … I need to remove
  it, punches and kill sound".
- **The Lab (F8) → Sounds** now lists, first, every layer a punch and a kill play: the swing's whoosh, the jab's,
  finisher's and charged hit, the charged swing, the deep thump (0.3.1), the kill's sound, its thump and its crack. **Play**
  hears one alone; **On/Off** takes it out of the game (till the page reloads). The designer: **"punch finisher is bad"**:
  a finisher's hit now plays the jab's hit, louder and lower (its own clip is no longer played).

## Numbers
All on F1: Hit feel, Fists, Dash, Slide, Camera.

## What was built
`sim/combat/execution.ts` (held where you grabbed it), `tuning/combat.ts`, `tuning/movement.ts`, `tuning/camera.ts`,
`audio/impactSounds.ts`, `audio/soundLayers.ts`, `combatSounds.ts`, `screens/LabSounds.tsx`, `engine/speedLines.ts`, `combatScene.ts`, `run.ts`. Tests:
`test-exec-air.ts`, `test-rush.ts`, `test-sound-layers.ts`.

## Next (proposed)
Brutal executions (slow motion on the last blow, the camera lunging in, a bigger burst, a bone crunch); parrying shots
back; a style rank. Launches and wall-splats for punched enemies.

## Unseen in the game
Checked by tests only: how the freezes, kicks and thumps feel, the speed lines' look, the faster dash and slide in the
rooms.

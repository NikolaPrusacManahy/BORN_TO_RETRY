# Update 0.3.2 — brutal executions

Status: built (2026-11-01). The designer: "the way execution can feel brutal" (the gameplay-feel list, "like Doom or
Ultra kill"), then "can we continue the current work?".

## The finishing blow
- **Slow motion:** when the body is let go (thrown) or bursts in your hands, the world drops to a quarter speed for half
  a second (real time), then eases back over 0.3 s. A thrown body flies in slow motion.
- **The camera lunges in:** the view narrows 14° at once and eases back out (slowly, in the slow motion).
- **A red flash** over the screen and **a shake**; the body landing shakes again.
- **Each blow before it** nods the view in a little (3°).

## Sound and blood
- **A bone crunch** under every blow (a few quick cracks over a dull thud), a bigger one as it ends. It's in the Lab's
  Sounds (F8) with the punches' layers, to hear alone or turn off.
- **More blood:** an execution's blows spray half again as much; a thrown body bursts where it lands, with pools all
  round (as one that bursts in your hands).

## Numbers
F1 → Execution: Finish: slow motion (0.25), Finish: slow time (0.5 s), Finish: lunge (14°). (placeholders)

## What was built
`engine/execFx.ts` (the slow motion, the lunge, the flash), `cameraRig.ts` (`lunge`), `combatScene.ts` (`realFrame`,
`timeScale`), `run.ts`, `tuning/execution.ts`, `bloodFx.ts`, `audio/impactSounds.ts`, `audio/soundLayers.ts`. Tests:
`test-exec-brutal.ts`; `test-sound-layers.ts`.

## Unseen in the game
Checked by tests only: how the slow motion and the lunge feel, the flash's strength, the crunch.

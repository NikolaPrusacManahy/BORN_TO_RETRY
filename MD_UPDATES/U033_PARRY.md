# Update 0.3.3 — the parry

Status: built (2026-11-01). The designer: "Yes, parrying" (the gameplay-feel list, "like Doom or Ultra kill"). An
early parry was taken out in M1 at the designer's request ("it returns later", `orbs.ts`); this is it back, new.

## What it does
- **Punch an enemy's shot** (a jab, a finisher or a charged punch, as it lands) and it's **sent back**: the way you
  look, or onto the enemy nearest your aim (within 20° of it).
- It flies **1.8 times as fast** as it came (26 m/s at least) and does **60 damage** to the enemy it hits (a jab does
  7). It hits enemies, never you, and pops on a wall.
- Every enemy shot can be parried: the fireballs, the Spitter's acid, the Glubs' water, spears, thorns, feathers,
  carrots. A sword's or an axe's swing doesn't parry (fists only); the slack is generous (the shot needn't be dead
  centre).
- **It never heals.**

## What you see and hear
- A freeze (110 ms), a gold ring where the shot was caught, a quick gold flash, the view nodding in, a shake.
- **A clang:** a bright ring over a punch's thump (in the Lab's Sounds, F8, to hear alone or turn off).
- The shot glows gold while it flies back.

## Numbers
F1 → Fists: Parry damage (60), Parry speed (×1.8), Parry speed at least (26 m/s); F1 → Hit feel: Hit-stop: parry
(110 ms). (placeholders)

## What was built
`sim/combat/parry.ts` (the catch, the flight back), `punch.ts`, `orbs.ts`, `targets.ts` (`parried`), `step.ts`,
`events.ts` (`parry`), `tuning/combat.ts`; `engine/execFx.ts`, `blowsFx.ts`, `shotsView.ts`, `audio/soundLayers.ts`,
`impactSounds.ts`. Tests: `test-parry.ts`; `test-sound-layers.ts`.

## Unseen in the game
Checked by tests only: how easy the timing is in a fight, the clang, the gold flash.

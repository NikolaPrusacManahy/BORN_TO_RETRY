# Update 0.3.7 — bodies flung into the air, and splatting against walls

Status: built (2026-11-01). The designer: "Punched enemies launching into the air and splatting against walls. next
this"; then, of the first build: "no 3rd punch of a combo launches, it is not something I want, it is like a stun I do
not want".

## Launches (bodies only)
- **A killing punch** (any jab or finisher that kills; a parried shot that kills) **flings the body up and away**,
  about 6 m. Bodies now fly and slide with the blow that killed them (before, they dropped where they stood). In the
  air a body slows only a little; on the floor it slides to a stop.
- **A live enemy is never thrown up.** (The first build's finisher threw a light enemy up and back, and a parried shot
  too: taken out, "like a stun I do not want".) Punches knock them back as before.
- Not a boss's body (its death show places it), not a large enemy's (the Brute and its like drop where they stand), not
  one on a ledge. A flier's body is flung but never thrown up (it falls).

## Wall-splats
- A body flung into a wall, or an enemy knocked hard into one (a finisher on one with its back to the wall), at **4.5
  m/s or faster splats** on it and stops there.
- **Alive:** **30 damage** (it may kill it) and the stagger of a hit. A wall can't be dodged.
- **Seen and heard:** the enemy's blood bursts at the wall and stays on it as a big splat (bigger the faster it came)
  with smaller ones round it; a pool under the body; a crunch over a deep thud; a shake and a camera kick, more the
  closer it is; a heavy hit marker. Bones and spores leave no stain. The Options' Blood setting applies (off: none).
- **Style rank:** "WALL SPLAT" (40).

## Knobs (F1 → Launch & splat)
Kill launch **7 m/s**, Kill fling **14 m/s**, Air drag **1.2/s** (a body in the air), Splat speed **4.5 m/s**, Splat
damage **30**. **(placeholder numbers)**

## What was built
`sim/enemies/flight.ts` (launch, the flight, a wall met), `sim/enemies/tick.ts` (the start of an enemy's tick, moved out
of `enemy.ts`; bodies fly too), `enemy.ts` (`splat`, `wall`), `update.ts`, `sim/combat/splat.ts`
(the damage, 'wallSplat'), `punch.ts`, `parry.ts`, `step.ts`, `events.ts`, `tuning/launch.ts`, `store.ts`;
`engine/wallSplatFx.ts` (the blood on the wall), `bloodFx.ts`, `combatScene.ts`, `combatFeedback.ts`,
`audio/impactSounds.ts`, `styleMeter.ts`. Tests: `test-launch.ts`.

## Unseen in the game
Checked by tests only: how the flights and the splats look in a real room (the stains' size and place on real walls).

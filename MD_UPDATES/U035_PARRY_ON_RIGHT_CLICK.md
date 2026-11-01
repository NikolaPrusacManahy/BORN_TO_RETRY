# Update 0.3.5 — right click is the parry; the block; no charged punch

Status: built (2026-11-01). The designer: "no more heavy punches from fists, now right click is parry, make a nice arm
block animation to show that the arm is ready to parry, but it still has to time the hit with the projectile properly".

## Right click, barehanded
- **No charged punch** any more. A weapon's right click charges as before (the Sword's pierce, the Axe's throw, the
  Hammer's smash, the Daggers' volley, the Grimoire's Ki blast, the Pistol's strike).
- **Held: the block.** Both fists come up before the face, apart (the crosshair clear between them), backs of the hands
  out, knuckles up, elbows down and in. No jabs behind it. Let go, they drop back to the guard.
- **The press opens the parry: 0.2 s.** A shot that comes within a fist's reach while it's open is sent back (as 0.3.3:
  onto the enemy nearest your aim, 1.8× as fast, 60 damage, a freeze, a gold ring, a clang). The fists punch forward a
  hand's width for that moment and settle back into the block.
- **Holding on doesn't parry**: pressed too soon, the window shuts and the shot gets through the block. **0.4 s** from a
  press before the next opens one (mashing doesn't help).
- Punches no longer parry (they did in 0.3.3).
- A low whoosh as the block comes up.
- The controls list calls right click **Parry**.

## The charged punch's Fate Cards, moved onto the parry
- **Hair Trigger:** the parry stays open twice as long (it was: the charged punch ready in half the time, for a dash).
- **Cold Snap:** parried shots (and slams, as before) freeze what they hit.
- **Thunderclap:** a parried shot arcs lightning to the nearest enemies where it hits.
- **Powder Keg:** thrown weapons and parried shots explode.
- **Giant Killer:** after a mini boss, free dashes and a parry that never waits (it was: an instant charged punch).
- **Heavy Hands** (a Death Card): a weapon's charge, slower, as before.

## Knobs (F1 → Fists)
Parry window **0.2 s**, Parry cooldown **0.4 s**. **(placeholder numbers)**

## What was built
`sim/combat/fists.ts` (the block and the window), `parry.ts` (from the window; the cards where a parried shot hits),
`step.ts` (tried each tick the window is open), `punch.ts` (no parry, no charged punch's cards), `cards/cardMoves.ts`
(`parryTimes`), `cards.ts` (texts), `events.ts` ('guard'), `engine/viewmodel/blockArms.ts` (the pose, rendered and
checked), `viewmodel.ts`, `run.ts`, `audio/soundLayers.ts`, `impactSounds.ts`, `input/bindings.ts`, `tuning/combat.ts`,
`tuning/cards.ts`. Tests: `test-parry.ts`, `test-fists.ts`, `test-combat.ts`, the card tests.

## Unseen in the game
Checked by tests and still renders of the pose: how the timing feels against real shots, and the block moving in play.

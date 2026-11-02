# Update 0.3.9 — the pillar finisher: through the pillar, which breaks

Status: built (2026-11-01). The designer (a screenshot of blood on a column): "next this, when the humanoid monster is
pinned there, another animation is played: right jab, left jab, right heavy hit punch and the enemy go through the
pillar and it breaks the pillar and it send the monster flying until it reaches a wall and explode there"; "The
animation for the pillar is simply break in half and the upper part fly and rest fixed once landed"; "Not just that
kind of pillar, anything that looks like this kind of fixed architexture".

## Which pillars
- **Every column of every floor** (whatever the floor's look: the plain columns, the stacked stone ones, the Throne
  Hall's skull pillars). A body pinned to one (0.3.8: a humanoid runner flung dead into it) gets the pillar finisher
  instead of the wall finisher.
- One already broken is a stump: a body pinned to it gets the wall finisher.

## The pillar finisher (free, +5 HP, as the wall finisher)
1. You're brought up to it, facing it (the pillar behind it).
2. A **right jab** to its head, a **left jab**.
3. The right drawn back, shaking; a **heavy punch** into its chest (a long freeze), your arm carried on out after it.
4. It's driven **straight back through the pillar**, which **snaps** (stone flying, a boom and a crack, a jolt), and
   flies on to the **wall beyond**, where it **bursts**, its blood on the wall.

## The break
- The column is **cut in two** where the body goes through it, a quarter of the way up (below your eye: cut at half its
  height, its stump hid the body flying on and bursting at the wall). A cap of darker broken stone on the stump and
  under the top.
- The **upper part flies** off the way the body went, tipping over, and **lies where it lands, and stays**. With a wall
  too close behind, it lands lying across instead.
- Its collision is as it was (the stump and the space above it): only its look changes. **"DEMOLITION"** on the style
  rank.
- Rendered and checked: the jabs and the heavy (straight wrists, normal fists), the column cut cleanly, the top flying.

## What was built
`sim/combat/pillars.ts` (the floor's pillars, which one a body hangs on, one broken), `world/dungeon/assemble.ts` and
`world/arena.ts` (every column a pillar), `sim/combat/state.ts` (the pillars; `carryOver` moved to `carry.ts`),
`execPin.ts` (the pillar finisher's moves), `execution.ts` (through the pillar to the wall beyond), `execThrow.ts`
(`wallPast`), `events.ts`; `engine/pillarBreak.ts` (the cut, the fall), `dungeonView.ts`, `level.ts`, `run.ts`,
`exec/pinLook.ts` (the hands), `combatFeedback.ts`, `audio/impactSounds.ts`, `styleMeter.ts`;
`tests/fakes/execRig.ts` and `tools/exec-shots.ts` (`grunt:pillar`, with the kit's column breaking). Tests:
`test-pillar.ts`.

## Unseen in the game
Checked by tests and renders: the break among a real room's pieces and light, and how often bodies end up on pillars.

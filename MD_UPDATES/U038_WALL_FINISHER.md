# Update 0.3.8 — finishers that use the walls: pinned bodies and the wall finisher; the Yeti's barrage

Status: built (2026-11-01). The designer: "I want a new type of finishers, Finishers that interact with environment";
"enemies being pinned to a wall when they die, they are thrown and they flicker for like 3 sec and die"; "while it
flickers, player can execute for free, gives 5 HP back for free"; "only the running type of enemy that have an
humanoid looks, like grunts, skeleton, rabbit, Leaper etc"; "the execution is the player facing the pinned enemy and
they hit the enemy 2 times, one left and right hand, they grab the head and pin the enemy on the ground and join fist
with a ground smash and they explode"; "Change the Yeti's execution to the exact one from the Blue demon".

## Pinned to the wall
- A **Grunt, Skeleton, White Rabbit or Leaper** flung dead into a wall (a killing punch's fling, 0.3.7), or killed by
  the splat, is **pinned there**: lifted off the floor, facing out, struck and held in that pose, **flickering white**.
- After **3 s** it drops off the wall and dies as any body does.
- Others (the Spitter, the large ones, the bosses, the fliers) splat as before and fall.

## The wall finisher (free)
- While it's pinned, **E** executes it **whatever the meter** (the meter isn't spent). The prompt and the crimson mark
  show as for any execution.
- You're **brought up to it** (1.3 m in front, facing it) in a blink, then:
  1. a **left hook** to its head, then a **right**;
  2. its **head grabbed** between your palms, pulled in, **slammed down** across the floor in front of you and pressed
     there;
  3. your **fists clasped** (the ground slam's) up, then **smashed down** on it;
  4. it **bursts** into pieces (as an execution's burst: blood, the crunch, the slow motion).
- It heals **5 HP**. Its kill was counted when it died (no second kill, coins or meter). Nothing hurts you meanwhile.
- The moves: rendered and checked (straight wrists, normal fists; the palms on the sides of the head, then pressing it
  down).

## The Yeti
- The Yeti's execution is **the Blue Demon's**: 30 punches into its chest and belly, the last to its face; it bursts.
  The others that had the Yeti's (the big Cactoro, the Skull Orc, the Big Mushnub, floor 5's mini bosses) keep the old
  one. Rendered and checked.

## Knobs (F1 → Execution)
Pinned time **3 s**, Wall finisher heal **5**. **(placeholder numbers but the 3 s and the 5)**

## What was built
`sim/enemies/flight.ts` (`PINNABLE`, `pin`), `tick.ts` (a pinned body hangs, then drops), `enemy.ts` (`pinned`),
`sim/combat/splat.ts` (pins), `execPin.ts` (the wall finisher's moves), `execution.ts` (free, brought up to it, 5 HP),
`execPose.ts`, `execKeys.ts` and `execThrow.ts` (moved out of `execMoves.ts` and `execution.ts`, past 300 lines),
`execMoves.ts` (the Yeti); `engine/exec/pinLook.ts` (its hands and look), `handMoves.ts`, `looks.ts`, `body.ts`,
`execScene.ts`, `pieces.ts`, `execView.ts`, `enemiesView.ts` (pinned: held, flickering); `tuning/execution.ts`;
`tests/fakes/execRig.ts` and `tools/exec-shots.ts` (`grunt:pin`). Tests: `test-pin.ts`.

## Unseen in the game
Checked by tests and renders: how often bodies end up pinned in real rooms, and the flicker in motion.

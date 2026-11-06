# Update 0.3.67 — pits burn you and bounce you back out

Status: built (2026-11-06). The designer: "let's change the rules of the lava pool and water pool / when falling in them, just take a few amount of damage and bounce back out, not teleporting away, just take damage and bounce out".

## The rule (`sim/dungeon/lava.ts`, `sim/player/pitBounce.ts`)
All pits share it: lava, floor 2's sludge, the sea and the shrine's ponds.

| | Before | Now |
|---|---|---|
| Damage | 50 | 10 (F1 → Health, "Pit burn") |
| Where you go | Teleported to the checkpoint | Thrown in an arc to where you last stood on solid ground |
| Your fight | Stopped: enemies gone, gates open, started over | Goes on as it was |
| Your view | Turned to face the door | Left alone |

- **Still kills:** with 10 health or less, falling in kills you ("The lava" / "The sea").
- **Sludge still poisons.**
- **Enemies knocked in still die**, as before: this rule is the player's.

## The arc
- It lasts about 0.9 s, longer the further it has to go and on the moon's gravity.
- It's a short guided arc rather than a kick. A wall takes away speed into it for good, so a plain kick could stop against the pit's wall and drop you back in. Here the sideways speed is worked out again each tick, so the wall only holds you until you've risen past it.
- You have no control through it, so nothing can hurt you through it either.
- It lands 0.4 m past where you last stood, so you're well onto the ground.
- If something tall is in the way you fall back in, take the burn again, and go 5 m higher next time, over it.
- If you've stood nowhere yet, it goes to the checkpoint.
- F1 → Health, "Pit bounce": how far over where you land it goes at its highest (1.8 m).

## Also
- The checkpoint is now only for a respawn.
- `tests/test-lava.ts` plays the bounce frame by frame in a pit with real walls. The tests' expected results changed on purpose: this is the designer's new rule.

## Files
- **New:** `sim/player/pitBounce.ts`.
- **Changed:** `sim/dungeon/lava.ts`, `checkpoint.ts`; `sim/player/state.ts`, `step.ts`; `tuning/health.ts`; `engine/run.ts`, `moveFeedback.ts`; `world/arena.ts`, `world/dungeon/coveRooms.ts`, `shrineRooms.ts`; `tests/test-lava.ts`, `test-alpha.ts`, `test-death.ts`, `test-floor6.ts`, `test-venom.ts`.

## Unseen
Not played. The arc is tested in rules with a stand-in pit, not on the real collision (Rapier). Check the feel first: its height and speed, and whether not being able to steer for 0.9 s feels right.

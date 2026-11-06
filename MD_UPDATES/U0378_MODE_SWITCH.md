# Update 0.3.78 — Mode Switch

Status: built (2026-11-06). The designer's "final touch":

> "when pressing e, while having the sword of course, switch to ranged mode, the way he holds the sword changes a bit and he sends slashes to the enemies (the same moves when we hold down left mouse button), he can sends multiple if he wants no limit. Remove hold left mouse button and left them hold to just continually attack normally. Call it mode switch, players can send serries of slahes. You will need at least 2 different way of swinging for this, the slashes will be sent in 2 different angles, like inclined slash east and west?"

This replaces the bible's Hold left click (Ember Wave).

## What it does
| | Up close | Ranged mode |
|---|---|---|
| **E** (sword in hand) | To ranged mode | Back up close |
| **Left click** | Blazing Arc: slash, backslash, overhead | Ember Slashes |
| **Hold left click** | Keeps swinging, the combo going round | Keeps slashing, on and on |
| The stance | As it was | Further forward, the blade leaned in across you, burning a little brighter so you can see you're in it |

- **Two slashes, each the other way:** the first from high on the right to low on the left, the second a backhand from high on the left to low on the right. Each throws a crescent leaning the way the swing came. They alternate; after a pause it starts from the first again.
- **No limit:** nothing is used up and there's no wait: about four a second, for as long as you hold it. Each goes through everything in line for 26 m.
- **Everything else works the same in ranged mode:** right click throws, Shift, Ctrl and Q are as they were, and it stays in ranged mode till you switch back, through a throw too. With the sword out, E is still the teleport. Near a chest or a shop, E is the chest or the shop first.
- A slash counts as a swing for the boss blows only a swing can meet (Hellwarden's cleave, the Drowned King's bite), and a crescent counts on The Swarm's eye.

## My choices (F1's The Demon tab; all placeholders till phase 5)
- **Each crescent does 16 damage, down from Ember Wave's 40,** because it's no longer charged and there's no limit. A stream does about 61 a second against about 91 for the combo up close, so getting close still pays. It hits everything in line though.
- **A shorter freeze on each hit (15 ms), a lighter jolt and a lighter sound,** because at four a second the old ones would judder.

## How it's built
`bladeSwing.ts`: `switchMode`, `SHOT_A`, `SHOT_B`; the charge is gone, and holding repeats. `demonPoses.ts`: `ARC_SHOT_A`, `ARC_SHOT_B`, `DEMON_RANGED`. `swordAnim.ts`: the stance, eased over 0.18 s. A crescent's lean is `EmberWave.tilt`. The HUD's line for E says Mode Switch, lit in ranged mode, and left click's says Ember Slashes.

## The poses (rendered through the game's own arms)
The wrist 38° at most through the first slash, 32° through the second, 35° in the stance.

## Still open
Not seen moving or heard by me, and the crescents have never been rendered.

## Tests
`tests/test-demon-ranged.ts`. Changed on purpose: `test-blazing-arc.ts` (seven swings), `test-demon-moves.ts` (the charge's section out), `test-demon-big.ts` (E's line on the HUD, seven swings), `test-demon-feel.ts` (a slash's shorter freeze).

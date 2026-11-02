# Update 0.3.18 — the Moon's crew (floor 8's enemies and mini bosses)

Status: built (2026-11-02). The plan's update 2 (`MD/FLOOR8_MOON_PLAN.md`). The designer: "forget about it that boss:
the boss is 3 guys, Frog mech + Fox mech + flamingo mech together; Mini boss - One spaceship and Bee mech (turn into
astronaut bee after mech dies); Normal enemies -> 3 spaceships and the astronaut Flamingo, frog, fox; Bee mech is able
to glide in the air and shoot salvos of missiles and lands with a 1sec cooldown; The AI of the enemies in rooms should
be well splitted with different roles". Floor 8 sends them now instead of the stand-ins. Its boss (the three mechs
together) is next: 0.3.19.

## Each animal its role
Each of the three animals comes **on foot** and **in its tiny ship** (and, as the boss, in its mech), with one role in
all of them:
- **Flamingo — range**: it keeps its distance and shoots down lines.
- **Fox — the flank**: fast, it comes at you from where you aren't looking.
- **Frog — the ground**: leaps, shock rings, mines.
("Fox" is the Space Kit's Rae the Red Panda.) Models: the Space Kit's astronauts, mechs and spaceships, their own
colours (one palette).

## The six regulars
1. **Gunner** (Flamingo astronaut). Keeps **9–16 m** off where it can see you (settling mid-range), sidestepping.
   With its turn its **gun glows (0.55 s)**, then a **burst of 3 slow blaster bolts** at your chest (9 each, 15 m/s:
   step aside). Then 2.6 s before the next. Too close, it backs off; within 3 m, it **kicks you off** (10).
2. **Flanker** (Fox astronaut). Fast (6.8 m/s). Waiting its turn it circles out of reach; with it, it **runs round to
   your side** (5.5 m off, left or right), **crouches with a hiss** (0.35 s: you hear it even off to your side),
   **darts in** (14 m/s) and lands **two quick punches** (8 each), then springs away.
3. **Leaper** (Frog astronaut). Keeps 5.5 m off, coming round cover to see you. With its turn it crouches (0.5 s) and
   **leaps high onto where you're heading** (1.1 s, its shadow over you): landing on you **18**, and a **shock ring**
   rolls out (10 if it catches you on the ground: jump it). 4 s before the next.
4. **Strafer** (Flamingo's tiny ship). Circles high; with its turn **its line shows on the ground** (pink, 0.5 s),
   then it **flies down it low**, **5 bolts falling along it** (7 each): step off the line.
5. **Diver** (Fox's tiny ship). Circles tight and fast; with its turn it **spins in place** (0.5 s, a whirr) and
   **rams you** (14), straight through where you were; missing, it pulls up.
6. **Mine-layer** (Frog's tiny ship). Drifts high round you, **dropping a mine ahead of you** every 2.4 s: it **floats
   down** in the low gravity (1.4 s), lands and **blinks** (faster as its fuse runs: 2.5 s), then pops (16 within
   2.4 m); come within 1.6 m of it and it pops at once.
The ships are a wasp's size (about a metre): a punch or two.

## Mini bosses
- **The Bee's ship** (Barbara's). Circles high and makes **passes** over you, its **twin lasers** firing down its line
  (its line shown yellow first). Every **3 passes**, a **bombing run**: its line marked **wide and orange** (0.9 s),
  then **6 bombs** down it (18 each, 2.2 m). Then it **drops low and hangs there cooling (2 s): stunned, hits do more**.
- **The Bee mech** (Barbara's). It walks at you; within 14 m it crouches, **jumps up on its jets and glides** round you
  (5 m up, 3.4 s), out of reach, firing **2 salvos of 6 missiles** that **curve after you** (10 each: dash through or
  sidestep). It comes down near you (15 if you're right there) and **holds there 1 s: its cooldown** (stunned, hits do
  more), then again. Close in on the ground, it kicks.
- **Broken, Barbara climbs out**: the **Bee astronaut**, her own health, fights on foot: **two quick blaster bolts**
  from 5–15 m, **quick punches** close in. The mech can't be executed (it must break, and Barbara climb out).

## The rooms: the roles split
A room's waves mix the roles: **every wave of three or more has range, the flank and the ground**; no role more than a
third of the wave and one; **the ships never more than half** (the rest on foot); **at most 2 Mine-layers**. At most two
shooters fire at once (the Gunners' bursts and the Strafers' passes take the ranged turns), the Flanker's dart and the
Diver's ram take the close turns, one Leaper leaps at a time. The Mine-layers and the mini bosses go their own ways.
(30 floors' worth of waves checked: all mixed.)

## Health (never tankier)
Gunner 35, Flanker 30, Leaper 45, Strafer 18, Diver 15, Mine-layer 20 (the floors before's regulars: up to 120); the
Bee's ship 300; the Bee mech 230 + Barbara 100 = 330 (Mako's 340 the most). A test holds it.

## With the rest of the game
- **Executions:** the astronauts as the Orc (the same skeleton); the ships none (no skeleton; a punch or two), nor the
  Bee mech. The astronauts are pinned to a wall they're thrown into dead.
- **Blood:** the ships and the mech shed metal chips.
- **The Lab (F8):** floor 8 has its column (page 3); floor 7 stays in the bottom row.
- **Seen:** blaster bolts (pink-white streaks), missiles (a steel body, its exhaust glowing and smoking), mines (a steel
  ball, its light blinking red), the Strafer's and the Bee ship's lines on the ground.
- **Heard:** made in code (a gun charging, a hiss, a spring winding, beeps, a whirr, an alarm, jets, pew-pews, thumps).

## What was built
`sim/enemies/gunner.ts`, `flanker.ts`, `hopper.ts`, `ships.ts` (Strafer, Diver, Mine-layer), `beeShip.ts`,
`beeMech.ts` (and Barbara on foot), `kindsMoon.ts`; `kinds.ts`, `enemy.ts` (the mech becoming Barbara), `update.ts`,
`tokens.ts` (their roles), `flight.ts`; `sim/combat/orbs.ts` (a homing shot), `targets.ts` (laser, missile),
`bombs.ts` (mines), `eventsMoon.ts`, `events.ts`, `execMoves.ts`; `sim/dungeon/wavePlan.ts` (the roster, `moonWaves`),
`world/dungeon/floorPlan.ts`; `tuning/foesMoon.ts`, `foesMoonB.ts`, `store.ts`; `engine/enemyLooks.ts`,
`enemiesView.ts` (a model with no clips), `shotLooks.ts`, `shotsView.ts`, `boss/bombView.ts`, `moon/crewMarks.ts`,
`combatScene.ts`, `depthsFeedback.ts`, `bloodLooks.ts`; `audio/moonSounds.ts`, `combatSounds.ts`;
`screens/deathText.ts`; `tools/blender/export_ship.py` (new: a ship without a rig), `export_monster.py` (the
astronauts and mechs); the models in `public/models/enemies/` (the four astronauts, the four mechs, the four ships).
Tests: `test-floor8-crew.ts` (new), `test-floor8.ts`, `test-crowd.ts`, `test-lab.ts`, `fakes/execRig.ts`.

## Checked without a browser
Rules (tests): the roster, every move above, the roles split, the homing, never tankier. Their models' clips read from
the files; the previews rendered (the astronauts, the mechs, the ships' tops and sides). Probes in every moon room:
each walker gets its attack off from across the room (the Flanker always; the Gunner, the Leaper and the Bee mech but
for a few spots wedged behind cover). **Not yet seen in the game**: their size against you, the ships' turn (their
noses), the bolts, missiles and mines, the lines, how the fights play, the sounds.

# Update 0.3.33 — floor 8, the Shrine Dimension: its martial artists

Status: built (2026-11-03). The designer: "make sure enemies are indeed martial art experts, dashing, side steps, etc
etc... something challeging. Make sure you match the proper animation, with 200+ animation SURELY you can do something
about it". The plan, `MD/FLOOR8_SHRINE_PLAN.md`: its six fighters and two mini bosses. Its boss is still on hold ("without
the Wolf yet, I will redesign him after").

## What changed
- **Floor 8 has its own enemies:** six fighters and two mini bosses, in place of the stand-ins. They're played from the
  Lab (floor 8 now has its own column there). The run still ends at Skull Cove (floor 7), and the boss is still a
  stand-in.
- **Their moves come from the Universal Animation Library.** Its clips are retargeted onto the More-enemies people's
  23-bone rig and baked into each fighter's model (19 to 23 clips each). Each move plays its own clip:
  - stance, jogging left/right/back, sprint;
  - dodges left and right, the block;
  - punches, kicks, knees, combos, back-flips;
  - sword combos and the dash cut;
  - throws, wall runs, ninja jumps, the roll, the bow's draw and shot, the staff's combos and slam.
- **Each blow lands where its clip's fist, foot or blade does.** Where the blow lands in each clip was measured, and the
  sim times every strike by its clip's length.
- **What they all share:**
  - a fighting stance at their own distance, side-stepping round you (one way, then the other) and backing off if you
    crowd them;
  - a sprinting dash in from further off that ends in a blow;
  - a side-step from your blows, likelier the more you've swung at them lately;
  - an opening after each strike: hit them then.
- **The weapons are made in code:** a katana, kunai, a bo staff. The bow is the RPG pack's.

### The fighters (never tankier: within the earlier floors' range)
| Enemy | Health | What it does |
|---|---|---|
| **Karateka** | 40 | Jab, cross, hook, a front kick that throws you back, a knee, a three-blow combo, a dash ending in a cross. Blocks 35% of blows from in front and **counters at once** with an uppercut that throws you up. Never blocks from behind. Side-steps 20%. |
| **Karate Girl** | 30 | Quicker (her clips play 1.25×) and closer in: jab, hook, kick, combo, a dash ending in a **flying knee**. Side-steps 35%. After her combo, half the time she **back-flips away** out of reach. |
| **Shinobi** | 28 | Keeps off. From range, **three shuriken in a fan**. From a few strides, a **dash cut** right through you and past: one cut, and a sideways dash slips it. Up close, quick cuts or a combo. A blow about to land on him, a third of the time he **vanishes in smoke and is behind you**, cutting. |
| **Kunoichi** | 24 | With a wall beside her, she **runs along it**, then leaps off it down on you. With no wall, she crouches and leaps. Her landing is a blow all round her: jump it or dash out. From range, two kunai. Side-steps 40%. |
| **Sand Ninja** (two looks) | 26 | Lobs **smoke bombs**: each bursts into a cloud you can't see through. Scatters **caltrops**: they cut you and slow you to 55%. Its tricks come before its dash. Crowd one and it **rolls away**. |
| **Archer** | 22 | Keeps far off and backs away if you come at her. She **draws with a glint**, holds 0.9 s, then shoots where you'll be. Every third shot is a **volley of three**. This floor's perchers. |

### The mini bosses
| Mini boss | Health | What he does |
|---|---|---|
| **The Sensei** | 320 | **His guard turns every blow from in front** (sparks). Each third blow brings his counter at once: his staff's uppercut throws you up. Hit him from behind, or while he's open after a combo. His attacks: staff combos of three and four blows; a **slam** that sends a ring out round him (jump it); a **ki palm** from range. Far off, he waits with his arms folded. |
| **The Shadow** | 300 | **His long cut:** he sets himself and a red line shows on the floor through you for 0.55 s, then he runs along it, through you and some 13.5 m on (step off the line). He sets it from 5–10 m. Up close, a combo or a heavy cut. From further, a leap that hits all round where he lands. **At two thirds and at one third of his health he splits off two clones:** one hit ends a clone, their blows hurt half as much, and they fade when he falls. Now and then he vanishes and is behind you. |

- **Rooms:** at most two Archers and two Sand Ninjas in a room. Most rooms have three kinds or more.
- **The lobby's bestiary** shows floor 8's nine on its row. Only Hell on Earth's row still says COMING SOON.
- **Sounds and feel:** all made in code, until recorded ones are picked from the Sonniss library.
  - A whoosh for each blow and a thud when it lands on you; a clack for a block.
  - Shuriken whir; a katana slices.
  - A smoke bomb pops and hisses; caltrops jingle.
  - A bow creaks as it's drawn and twangs when it shoots.
  - The Sensei's slam booms; the Shadow's cut line hums.
  - A landing, the slam and a counter shake the view.
- **Effects:**
  - smoke clouds that billow and thin out;
  - caltrop spikes on the floor;
  - the Shadow's red cut line;
  - the Archer's glint;
  - shuriken that spin as they fly;
  - the Sensei's ki in blue fire;
  - the clones see-through.

## What was built
- **Tools:**
  - `tools/ual_people.py` (new): retargets UAL onto the people's rig and bakes it.
  - `tools/ual_fighters.py` (new): each fighter's clips.
  - `tools/ual_lands.py` (new): measures where each blow lands.
  - `tools/blender/export_people.py`: the code-made katana, kunai and staff, and the bow in the left hand.
- **Models:** `public/models/enemies/{karateka,karate_girl,shinobi,kunoichi,sand_ninja,sand_ninja_f,archer,sensei,shadow}.glb`
  (new, 11 MB together).
- **Sim:**
  - `sim/enemies/martial.ts` (new: the shared fighting brain) and `shrineShared.ts` (new: moves, clip lengths and
    where blows land).
  - Each fighter (new): `karate.ts`, `shinobi.ts`, `kunoichi.ts`, `ninjaLeap.ts`, `sandNinja.ts`, `archer.ts`,
    `sensei.ts`, `shadow.ts`; `kindsShrine.ts` (new).
  - Hazards: `sim/combat/smoke.ts` (new) and `eventsShrine.ts` (new).
  - Registered in `kinds.ts`, `update.ts`, `evade.ts`, `tokens.ts`, `wavePlan.ts`, `warbandWaves.ts`, `floorKinds.ts`,
    `execMoves.ts`, `flight.ts`, `targets.ts`, `ground.ts`, `step.ts` and `events.ts`.
- **Tuning:** `tuning/foesShrine.ts` and `foesShrineB.ts` (new).
- **Engine:**
  - New: `engine/shrine/shrineLooks.ts`, `shrinePose.ts` (the wall run's lean), `shrineFx.ts` and
    `shrineFeedback.ts`; `audio/shrineSounds.ts`.
  - Changed: `shotLooks.ts`, `shotsView.ts`, `norse/norseLooks.ts`, `combatScene.ts`, `run.ts` (the caltrops' slow).
- **Screens:** `deathText.ts`, `labLists.ts`.
- **Tests:**
  - `test-shrine-fighters.ts` (new: 35 checks);
  - `test-crowd.ts`, `test-lab.ts`, `test-shrine.ts`, `test-lobby.ts` (the bestiary's floor 8 row), `fakes/execRig.ts`
    (the fighters' models, for executions).

## Checked without a browser
- **Tests:**
  - **Roster and health:** the roster, never tankier, roles, executions.
  - **Clips:** every clip each fighter plays is in its model, and each strike is timed by its own clip's length.
  - **Fighters:**
    - the Karateka's stance, side-steps, dash, jab timing, block and counter, and his dodges rising with pressure;
    - the Karate Girl's dodges and back-flip;
    - the Shinobi's fan of three, his dash cut and his vanish;
    - the Kunoichi's wall run and leap;
    - the Sand Ninjas' smoke, caltrops and roll;
    - the Archer's draw, volley and backing off.
  - **Mini bosses:** the Sensei's guard, counter, openings and slam; the Shadow's cut, his split, his clones and their
    fading.
  - **Rooms:** what each room may hold.
- **Renders in Blender:** the retargeted poses, karate and each weapon's grip.
- **Not yet seen in the game:** how the clips look in three.js at speed, and how the fights feel.

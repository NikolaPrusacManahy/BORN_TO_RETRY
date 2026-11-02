# Update 0.3.16 — floor 6's boss: the Big Shark

Status: built (2026-11-02). The plan's update 3 (`MD/FLOOR6_PIRATE_PLAN.md`). The designer: "can you do the Boss on Floor 6,
new cinematic"; the show and two of its moves are the designer's, the rest Claude's ("The other moves can be decided by
you"). Asked and answered: the jaw moves are dodges in time (an arrow, press that way); the "ceiling" that goes up is the
water's top.

## The arena
- Floor 6's boss room: **its walls half again as high** (9 m: four and a half rows of the kit's wall, capped), solid over
  its doorways too (nobody swims out over a gate).
- **Flooded** in its show to **8.4 m** (just under the walls' top); open sky above. You **swim** in it (floor 6's old
  swimming: forward where you look, jump rises, slide dives, the dash kicks); under the water the view is the Sunken
  Grove's (the surface overhead, the sun's shafts, specks, bubbles, the water's haze).
- **Dead, it drains** (3 s) and you walk out by the wooden gate.
- No walls sliding back, no portal: the arena is whole when you walk in.

## The show (the designer's)
1. Stepping in, the view leaves your eyes for **high over the near corner** and drifts down as **the water floods** the
   arena and climbs its walls (4.5 s).
2. **Over the shark's left shoulder, close,** as it sweeps round the far side under the water (2.8 s).
3. **A fixed shot under the water**: it swims straight at the view, rising, and bursts up past it (1.4 s).
4. **Ahead of it as it leaps out of the water** and crashes back in: **slowed mid-leap** (0.4 speed), **its name
   on the right** (it fills the left of the view).
5. Back into your eyes, quickly, under the water now, facing it.
(As changed after the designer played it: below.)
A presentation in the spirit of shark games like Maneater; the shots are the show's own, made in code.

## Its moves
It circles you (9 m off) a lap or so, then:
- **Lunge** (the designer's): it lines up on you, jaws opening (0.9 s), and lunges through you (24 m/s). As its jaws come
  **an arrow shows the way to go**, with that way's move key: **press move left or move right** that way in the window
  (the last 0.5 s, and while it comes) and you're thrown clear. Press the wrong way and you can't escape that bite.
  Bitten: 30.
- **Snap** (the designer's): it swims past close and, beside you, swings its head back (0.7 s) and snaps sideways at you:
  the **arrow points away from it**; press that way and it misses. Bitten: 22.
- **Swallow** (the designer's): every third move it **backs off, jaws wide** (1.4 s), and **charges to swallow you
  whole**. Swim or kick out of its way and it misses (into a wall or a column, its teeth stick: stunned). Caught: **your
  hands hold its jaws apart**, your left palm pushing its upper jaw up, your right fist holding its lower jaw down,
  the world still (the Bone King's hold: the screen counts your clicks). **Click 12 times in 3 s** (its jaw forced open
  with each, closing as time runs out) and **you punch its throat** (60): it's stunned and spits you out. Too slow, its
  jaws close: **one shot**.
- **Tail**: close behind it, its tail whips you (16).
- **Teeth in a wall**: a lunge or a swallow into a wall or column sticks it there, stunned (2.5 s, hits do more).
- **Frenzy**: below half health it roars once; after that its warnings and laps are 0.7 as long.
It never flinches. Health **1800** (the Velociraptor's; no more than the Drowned King's 2000: never tankier).

## After the designer played it
The designer: "the arena isn't appropriate for the Shark at all, it bumps on pillar, has difficulty to navigate, try to
find a new design that would fit an underwater boss arena, maybe weeds or anything sea related"; "the way it moves isn't
quite right, it needs to be faster, it does swim around fast and have unpredictable moves"; "the shoulder camera needs to
be maybe it's left side, much closer … than before the jump we have a fixed shot of the shark going toward the camera
(still under water), then the jump in the air needs to be x2 faster also the remaining sequence to be faster".
- **Its own arena, the Shark's Graveyard** (`coveRooms.ts`): **open water in the middle, nothing standing in it**; sea
  cliffs in its four corners, **arches of giant ribs** near its far walls, **small boats sunk** against its sides,
  **seaweed** in clumps across the sand (you swim through it), treasure, skulls, cannonballs and an anchor lying among
  it (all from floor 6's pirate pack). **No torches** on its walls (they'd burn under the water).
- **Faster, never the same**: it circles at **13 m/s** (was 8), its circle swelling and tightening, weaving up and down,
  **turning back** on itself now and then; its next move can come **any moment** once a third of its lap is gone (2.2 s
  on average); a quarter of its moves are **feints** (it lines up an instant and rushes past you, close, no bite, no
  arrow); its lunge **30 m/s** (was 24), its swallow's charge **24 m/s** (was 20).
- **No more bumping**: it circles a point moved out from the walls until **its whole circle is open water** (never more
  than its circle off you, so it still sweeps past you); its swallow backs off towards open water; **with a wall right
  behind you it won't lunge through you into it** (it snaps from the side), so a corner isn't a free stun; its tail no
  sooner than 2 s into a lap. A probe of a minute's fight in the arena, you held in the middle, by its ribs, by a boat,
  in a corner and by the gate: its body inside something under 6% of the time (only for an instant: its teeth in a
  wall after a swallow you dodged), at 13 m/s; before, up to 25%.
- **The show, tighter**: **over its left shoulder, close** (2.8 s, was 3.4); then a **fixed shot under the water** as
  it swims straight at the view, rising, and bursts up past it (1.4 s, new); then **its leap, twice as fast** (2 s of
  show time slowed to 0.4 mid-leap: about 3.3 s on screen, was about 6.8); **back in your eyes faster** (0.6 s, was 1.2).

## Knobs (F1 → Big Shark)
Every number above, the show's beats and the water's height. **(placeholder numbers)**

## What was built
`sim/enemies/bigShark.ts` (its fight), `bigSharkMoves.ts` (its moves, the arrow and your answer), `kinds6.ts`, `kinds.ts`
(floor 6's boss), `update.ts`, `tokens.ts`; `sim/combat/jaws.ts` (its jaws on you), `grab.ts`, `eventsCove.ts`;
`sim/dungeon/sharkShow.ts` (its show's beats, path, water and slow motion), `bossRoom.ts`, `wavePlan.ts`;
`sim/player/state.ts`, `step.ts` (your sideways presses); `world/dungeon/tallWalls.ts` (the arena's walls), `dressing.ts`,
`cores.ts`, `assemble.ts`, `styleTypes.ts`, `styles.ts`; `tuning/bigShark.ts`, `store.ts`; `engine/boss/sharkCinema.ts`
(its shots), `bossShow.ts`, `engine/cove/sharkArena.ts` (under its water), `depthsView.ts`, `dungeonView.ts` (its haze,
its flood's colour), `engine/exec/jawHands.ts` (your hands on its jaws), `exec/hands.ts`, `run.ts`, `combatScene.ts`,
`enemyLooks.ts` (measured by its whole posed body: its teeth had been measured, six times too big), `overlayFeed.ts`,
`hudStore.ts`, `screens/JawCue.tsx` + `ui/theme/theme-40-jaws.css` (the arrow), `Hud.tsx`, `deathText.ts`,
`labLists.ts`, `gameBase.ts` (the Lab: its room); `audio/sharkSounds.ts` (made in code), `combatSounds.ts`,
`engine/depthsFeedback.ts`; `tools/blender/export_monster.py` → `public/models/enemies/big_shark.glb` (the Pirate Kit's
Shark); `tools/jaw-shots.ts` (the jaw hold rendered), `tools/boss-shots.ts` (its arena and shots; the kit read untextured).
Tests: `test-floor6-boss.ts` (new), `test-floor6.ts`, `test-floor6-crew.ts`.
After the designer played it: `world/dungeon/coveRooms.ts` (the Shark's Graveyard), `rooms.ts`, `cove.ts` (its seabed),
`dressing.ts` (no torches in it); `sim/enemies/fishSwim.ts` (a circle round a given point), `bigShark.ts`,
`bigSharkMoves.ts` (open water: `openAt`, `openMiddle`, `roomPast`; the feint); `tuning/bigShark.ts`;
`sim/dungeon/sharkShow.ts`, `engine/boss/sharkCinema.ts` (the shots); `tools/boss-shots.ts` (`--beat=`),
`tools/blender/demon_at.py` (the boss drawn in the renders again, at its depth).

## Checked without a browser
Rules: every move, both escapes, the jaws both ways, the show's beats, the water, the walls, the open arena, its circle
off the walls, no lunge into a wall behind you, the feint (tests). Rendered in Blender: your hands on its jaws and the
punch to its throat (`tools/jaw-shots.ts`), the arena flooded and the show's cameras with the shark where it is then
(`tools/boss-shots.ts --beat=`: over its shoulder, coming at the view under the water, leaping on the left of the view). **Not yet seen in the game**: the show's motion and slow motion, under its water, the arrow on
screen, how the fight plays, the sounds.

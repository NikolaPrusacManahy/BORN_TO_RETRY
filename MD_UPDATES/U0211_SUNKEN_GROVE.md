# Update 0.2.11 — Floor 6, the Sunken Grove

Status: built (2026-10-31): the level, then its enemies once the designer had seen it. The designer: "let's design floor 6 … I want a continuity, I want a
full under water gameplay in that floor and that is the way difficulty is hard in this level, enemies swims faster than
you and you have to deal with the pain of being slower than them, swiming feeling and mechanics is needed … first design
a floor that has been fully flooded, the logs and design that shows that the environemtn is in the water, moss, rotten
surface, trees … show me a enemies list and designs after the level is done … we will discuss enemies wise after level
design is done". The design below is Claude's; its numbers are placeholders on knobs.

## The idea (continuity)
Floor 5's temple flooded with the tide; below it the water has won. Floor 6 is the grove the temple was built over,
drowned to the brim of its walls: the same stone, rotted and overgrown, dead trees standing in silt, seaweed swaying,
mossy logs and stones on the floor, the sun far above coming down through the water. You never get out of the water on
this floor: from its first room to its boss you swim.

## Swimming (the floor's rule)
- You swim, you don't run: **6.5 m/s** (on foot you run at 12). Forward is **where you look**, up and down too; Space
  rises, the slide key (C) dives. You speed up slowly (0.45 s) and **glide** to a stop when you let go (0.9 s);
  doing nothing you **sink**, slowly (0.7 m/s), back to the floor.
- On the floor, Space pushes off it (5.5 m/s up).
- **The kick** (the dash key): a burst where you're heading (14 m/s, bleeding back to swim speed), untouchable while
  it lasts (0.3 s), as the dash is. Same charges, but each comes back **1.75 × slower**.
- No wall runs, wall jumps, slides or jump pads under water. The slam still works: a dive from 2.8 m up.
- **The water's top** is just over the walls (6.4 m): your head never leaves it, so you can't swim over a wall.
- Enemies swim **faster than you** (the fish below): you can't outswim them, only out-kick them for a moment.

## The look
- Floor 3's stone, rotten: dark green-brown walls furred with algae, a darker rotten floor, the cores and the slab under
  it near black-green.
- **No sky**: over everything the underside of the water's surface, bright, rippling, the sun coming through it.
- **Sunlight under water**: caustics (the dancing net of light) on every floor, ledge and top; shafts of light slanting
  down through the rooms; a pale blue-green haze (bright, as every floor is: never murky); specks drifting in the water;
  bubbles rising from the silt.
- **Drowned trees** (the Nature pack's dead willows, dead trees and dead birches, rotted dark) stand in **beds of silt**,
  never out of paving. **Seaweed** (the pack's tall grass and plants, recoloured) grows from silt beds and sways.
- Mossy logs, stumps, mossy rocks, bones and skulls along the walls. Low cover is **mossy boulders** (no crates).
- **No torches** (nothing burns down here).
- Sound: everything you hear is **muffled** under water; the kick is a bubbly push.

## Rooms (ten, its own)
Swimming makes every room 3D: ledges and towers are reached from any side, so the rooms use height for cover and lines
of sight instead of for escape. No pits, no jump pads.
1. **Drowned grove**: drowned trees in silt beds across an open floor, seaweed between them.
2. **Kelp rows**: long beds of tall seaweed in rows, a few trees: lanes to swim down and over.
3. **Sunken nave**: rows of columns, high galleries along both walls, broken columns fallen between.
4. **Root hollow**: a ring of drowned trees round a middle bed of silt, boulders in it.
5. **The terraces**: stone terraces stepping up into each corner (1 m, then 2.5 m), perches on top.
6. **Pillar forest**: a grid of tall columns (5 m) to swim between.
7. **Fallen colonnade**: a toppled colonnade: broken columns and boulders in a long diagonal.
8. **Twin towers**: two great towers (2.5 m) with perches, seaweed on the floor between.
9. **The drift**: open water, only a few boulders and weeds: where the fast fish shine.
10. **Sunken altar**: a raised altar in the middle (1 m, then 2.5 m), drowned trees round it.

## Its own challenge room: the drowned heart
The designer saw the floor ("floor 6 looks very good"), asked how many rooms and challenge rooms there were (ten rooms;
the challenge room was one of them, as on every floor), and asked for one of its own: "Yes, design one". The design is
Claude's.
- **The grove's heart**, where its oldest trees drowned: **bigger** than the other rooms (64 m across, theirs 56 m), for
  ten enemies fighting at once in open water.
- In each corner a **raised cloister walk** (1 m) with columns along it; **four towers** (2.5 m, a step up their side, a
  perch on each) round the middle; in the middle a **ring of eight drowned trees** in a wide bed of silt and seaweed;
  boulders between.
- Fight on every level: the cloister walks, the towers' tops, the open water over the silt.
- Always floor 6's challenge room (the same rules as every challenge room: off the way, its count a room's as deep plus
  6, 10 fighting at once, 2 mini bosses, its chest), never on the way. A floor can now have a challenge room of its own
  (`RoomTemplate.challenge`); floors 1–5 keep picking one of their fight rooms.

## How hard
The curve the designer set: 7 fight rooms on the way (as floor 5), 2 more enemies in every room. The floor is hard by its rule:
you're slower than everything in it, every fight is in three dimensions, and the kick is slower to come back.

## Enemies (built)
Claude proposed seven from the designer's fish; the designer: "no porting floor 5 monster, work with these instead,
maybe a smaller version of Drowned king? that can be done". So floor 6 sends only its fish, and its percher is a
smaller Drowned King. Every fish swims faster than you (you: 6.5 m/s), follows you up and down, hits at any height, and
dies belly up, floating towards the top. The models have only their swim clip: wind-ups beat it faster; tipping,
wriggling, thrashing and dying are turned in code.
- **Clownfish** (the School): circles you 4.5 m off at your height (10 m/s); by turns one flashes (0.35 s) and darts
  through you (15 m/s), nipping (6). Weak (20).
- **Tuna** (the Torpedo): keeps 13 m off, level with you; its tail beats fast (0.8 s, a rising hum), then it charges
  through where you were (20 m/s, 28 m: 20, thrown). Into a wall it's dazed 1.5 s (hits do more).
- **Angelfish** (the Flanker): works round to 2.6 m behind you (8.5 m/s); looked at (within 40°) it veers off to your
  side; behind you it flashes (0.4 s, a click) and bites (15). Keep facing it and it never bites.
- **Dolphin** (the Bumper): circles below you (10 m/s); when you're off the floor it slips under you, bubbles rise there
  (0.6 s) and it rams straight up (14), throwing you up (9 m/s). On the floor you're safe from it.
- **Drowned Prince** (the percher: a smaller Drowned King, 2.2 m, crowned): on a high perch (or the floor) it rears
  (0.9 s), then by turns its **jet** (sweeping 70° across you at the height your chest was: swim over or under it; 12)
  or **3 geysers** (each under you as it's called: be off the floor; 12).
- **Manta Ray** (mini boss): glides 4 m over you. Over you, its **blanket**: its shadow marks the floor (1 s), it drops
  straight down (26 to what's under it) and lies there 1.6 s (hits do more). You behind it, its **barb** (poison 6 a
  second, 4 s). Otherwise its **gust** (a 16 m/s shove).
- **Shark** (mini boss): circles you, tighter every second (from 11 m, 12 m/s); turns on you (0.5 s) and lunges
  through you (22 m/s: 22). Hit it hard as it comes (15: a punch on the nose) and it's stunned; into a wall too. 40% of
  its bites are its **death roll**: it holds you and shakes you (7 a shake) for 2.5 s, unless you hit it 60 (or one
  staggering blow) and break free. Below half it **frenzies**: 1.35 times faster, its warnings that much shorter.
- **The Old Whale** (the boss): 13.5 m long, 2600 health. It swims laps round its room (17 m out, halfway up); its
  **wake** drags you along with it. **Phase 1**: its **ram** (its lane shows 1 s, then 24 m/s through you: 30; into a
  wall it's stunned 2.2 s) and its **song** (1.2 s drawing breath, then a ring rolling out 40 m: 18 if you're in the
  open, nothing behind a tower or a column). **Phase 2** (below half, next on its laps): it roars, calls **5 Clownfish
  once**, and adds its **inhale** (3 s: in front of it the water pulls you to its mouth at 5.5 m/s against your 6.5;
  swallowed: 40, spat out) and its **breach** (it rises to the top over you, marks where it'll crash (0.9 s), crashes:
  28 under it, and its shock throws whatever's within 1.6 m of the floor and 14 m round; then it lies stunned).
- Sounds are code-made placeholders (muffled under water), but the Whale's roar and crashes (the library's, the
  Demon's). Executions: the fish as the Wraith's (the mini bosses too: one mesh, nothing to burst), the Prince as the
  Orc's.

## What was built
- Swimming: `sim/player/swim.ts`, `tuning/swim.ts`; `PlayerState.swimTop`, `PlayerIntent.pitch`/`jumpHeld`.
- The floor: `styles.ts` (`SUNKEN`), `sunkenRooms.ts` (and `SUNKEN_CHALLENGE`, the drowned heart: `floorPlan.ts` makes
  it the challenge room), the drowned trees and seaweed (`dressExtras.ts`, the kit).
- The view: `engine/underwater.ts` (the surface, light shafts, specks, bubbles, caustics), the camera's sway
  (`cameraRig.ts`), the muffle (`audio.ts`).
- The enemies: `reefFish.ts` (Clownfish, Angelfish), `rammers.ts` (Tuna, Dolphin), `prince.ts`, `manta.ts`, `shark.ts`,
  `whale.ts` and `whaleMoves.ts`; what they share `fishSwim.ts`; numbers `kinds6.ts`, knobs `tuning/foes6.ts`,
  `foes6b.ts`, `whale.ts`; events `events6.ts`; drawn `fishPose.ts`, `fishFx.ts`; felt `fishFeedback.ts`; heard
  `fishSounds.ts`; models exported with `export_monster.py --attack Swim`, sources in `used_fish/`.
- Tests: `test-floor6.ts`, `test-swim.ts`, `test-floor6-foes.ts`, `test-floor6-minis.ts`, `test-whale.ts`.

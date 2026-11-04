# Update 0.3.43 — Hell's look (floor 10, Hell on Earth: its level)

Status: built (2026-11-04). The designer asked: "what do we design in floor 10? crazy versions of current enemies? a hell
level?". They then agreed to Claude's mix (`MD/FLOOR10_HELL_PLAN.md`): "Go with your mix", then "Agreed, start".
This is that plan's first step: **Hell's look on the Forge's rooms** (the stone, sky, light, dressing, burnt trees and
brimstone rain). Its enemies, the echo rooms and Hellwarden come next, each its own update.

## What it looks like now
- **The stone:** floor 3's stone turned to basalt.
  - **The walls:** dark and a little glossy (they catch the hot light).
  - **The paving:** a red-brown, lighter than the walls, so the black iron and the orange lava stand out on it.
  - **The other pieces:** the iron is dark, the bones scorched, the wood charred.
- **Lava in the stone:** seams of lava glow through the walls and the paving. They are cracks in the stone, a coarse net
  and a fine one, with some stretches of stone left whole:
  - hottest at the walls' feet, fading out by 3.5 m up; on the paving, anywhere;
  - they breathe slowly;
  - they run across the kit's pieces without seams (laid on the world, not on each piece);
  - made in code: a crack map drawn once, then a patch on the stone's shader that costs two texture reads a pixel and no
    lights;
  - F1 → Hell → Lava in the stone sets how bright (0 turns them off).
- **The sky:** a furnace sky round the view.
  - **The dome:** bright orange at the walls' tops, the haze's own colour, so far walls melt into it. It deepens to red
    overhead.
  - **Sun, ash and smoke:** the sun is a dull red disc. Banks of ash cloud drift slowly round, and columns of smoke rise
    beyond the walls, glowing at their feet.
  - **Bright, as you asked:** the sky light is warm and strong, and the light from below is the lava's, orange.
- **Chains** on the rooms' walls, heavy dark iron, each link through the next with a ring in the wall at each hook:
  - a swag between two hooks across two cells of wall (4.4 m up, sagging about a metre);
  - a chain hanging straight down from the wall's top, ending about 3 m up;
  - at most three on a wall of a room, all over your head;
  - never by a door, a wall torch or a skull on the wall, nor in a corner; none in the boss room (its walls slide).
- **Braziers:** one in each corner of a room.
  - **What one is:** an iron bowl on three legs, 1.5 m high, with the kit's wood fire burning in it and a glow round it
    (with Glow on; F1 → Hell → Brazier glow).
  - **Solid:** you and enemies walk round them.
  - **Never** by a door, a chest or where enemies come in; none in the boss room.
- **Burnt trees in beds of ash** in five of its open rooms (smelting hall, belt loop, bellows, great press, press
  gallery). They are floor 2's charred dead trees, about 4.8 m tall, with solid trunks. Trees grow from earth, so never
  on paving.
- **On the walls and floor:** a skull on the wall now and then. Along the walls lie bones, skulls, rocks and glowing ore.
  Low cover is basalt boulders (not crates).
- **Embers and ash** rise round you, hotter than the Forge's.

## Brimstone rain
- Burning rocks fall in three of its rooms while they fight: the smelting hall, the workshop and the great press. These
  are the Moon's meteors, burning.
  - **Not the lava crossing:** a throw there would land you in the lava.
- About every 4 s, one is called down where you'll be:
  - a ring of fire glows on the floor at its whole reach from the first moment;
  - 1.4 s later it strikes: 18 to you and you're thrown; 60 to an enemy.
  - It leaves a scorch.
- **The look:** a black rock burning, with a trail of fire.
- **Its knobs are Hell's own** (F1 → Hell: every, warning, lead, reach, hit, on a foe, throw). The Moon keeps its own.

## Tuning (F1 → Hell (floor 10))
Brimstone every, warning, lead, reach, hit, on a foe, throw; lava in the stone; brazier glow. **(placeholders)**

## Files
- **The look:** `world/dungeon/hellStyle.ts` (new; the Forge's sooty look retired). New look fields in `styleTypes.ts`:
  `ashBeds`, `cracks`, `gloss`.
- **Chains and braziers:** `world/dungeon/hell.ts` (new) lays them out; `hellOf` on the level, braziers' blocks among the
  arena's boxes, their fires dressed (`ownDressing.ts`).
- **Rooms:** `forgeRooms.ts`: `R` trees in five rooms, `meteors` in three.
- **Drawn:**
  - `engine/hell/cracks.ts`: the crack map and the stone's patch, applied in `kitMaterial.ts`;
  - `engine/hell/hellSky.ts`: the sky;
  - `engine/hell/hellView.ts`: the chains (each room's one mesh), the braziers' iron, the glows, the cracks' clock;
  - held by `depthsView.ts`.
- **Brimstone:** `sim/dungeon/meteors.ts` (`rainOf`: the Moon's knobs or Hell's) and `engine/moon/moonView.ts` (Hell's
  look).
- **Tuning:** `tuning/hell.ts` (new).
- **The Lab:** floor 10 is in it again (`screens/labLists.ts`). Its enemies and boss still stand in, so it's a Floor 10
  button in the panel's bottom row, not a column (the designer looked for it there).
- **Ash beds:** `dressing.ts` (Hell's beds always ash).
- **Motes:** `motesView.ts` (Hell's).
- **Renders:**
  - `tools/hellShots.ts` (new): Hell's meshes, the crack map and its sky, for `dungeon-shots.ts`;
  - `tools/blender/hell_look.py` (new): copies the look in Blender. It lays the same crack map the same way, colours the
    sky by height, lights the scene from above and below, and makes the fires glow.
- **Tests:** `tests/test-hell.ts` (37 checks): its look and how bright; the cracks (only its stone, the shader patch, the
  map tiling); the chains (on walls, overhead, by nothing, evenly linked, drawn where they hang); the braziers (in
  corners, solid, burning, clear); the trees (in ash, solid); the brimstone (its rooms, Hell's knobs, the ring, the hit);
  the sky; the cost. `test-forge.ts` treats a tree as in the way.

## Cost
- **The chains:** about 80 a floor, 1,200 links (each 36 triangles), one mesh a room, so a room out of view isn't drawn.
- **The rest:** the braziers (36 a floor) are one mesh; the sky is a dome and 52 sprites. Built in about 15 ms when the floor
  loads.
- **The cracks:** two texture reads a pixel on the stone.

## Unseen
- **Seen:** Blender renders of floor 10 (seed 3), copying the look (the game's own crack map, chains and braziers, its
  sky's colours); and the tests.
- **Not in the renders:** the sky's sun, ash and smoke, and the brimstone falling. They aren't the game's renderer
  either.
- **Not played:** how bright it is on your screen, and the cracks at a distance. Please try it: Lab (F8) → Floor 10 (the
  panel's bottom row). F1 → Hell sets the cracks and the braziers' glow.

## Next (the plan's order)
1. Hell's own enemies from the Bestiary: Imp, Puglin, Bone Axeman, Bone Guard (their clips retargeted and rendered
   first).
2. The rest of its roster: Cinder Chicken, Brimstone Bee; the Demon back and Mushnub Evolved as mini bosses (the open
   questions in the plan still stand).
3. Hell-touched traits and the echo rooms.
4. Hellwarden, then its show.

# Update 0.3.32 — floor 8, the Shrine Dimension: its level

Status: built (2026-11-03). The designer: "let's talk about floor 8 - Japan theme … karate or martial art enemies … the
floor is going to have Sakura trees and a shrine and this kind of thing, loads of sakura leaves etc etc"; More_nature
added "to be used in any floors and maybe if any can be used here"; "I don't see other assets that can be found on
the website for Japan theme". The plan, `MD/FLOOR8_SHRINE_PLAN.md`: "go with that, without the Wolf yet, I will
redesign him after". This is its first part: **the level**. Its enemies come next; its boss is on hold.

## What changed
- **Floor 8 is built** and playable from the Lab (a new floor, in the bottom row). Its enemies and boss are stand-ins
  until their own come (the dry floors' enemies, the Velociraptor). The run still ends at Skull Cove (floor 7).
- **Its look:** floor 3's stone as pale castle stone and worn grey paving, under a soft spring sky with a pale pink haze
  and a warm sun. Far off on every side, **islands of rock float** among banks of cloud, drifting up and down. On them
  stand a pagoda, a torii, the shrine hall, a bell tower, a small shrine, sakura and a bonsai.
- **Sakura, and petals everywhere:**
  - More_nature's ten "Tree" models are its cherry trees, in beds of dark earth.
  - Their textures weren't in the folder, so their bark is flat colour and their blossom cut-outs are drawn in code:
    pink clumps covered in five-petalled flowers, clipped. The same is done for pine needles and red maple leaves.
  - A carpet of fallen petals lies under every sakura, thickest at its trunk.
  - Petals fall all round you, flat and tumbling, carried on the wind in gusts (900 of them, fewer on Effects low).
- **Its pieces, made in code** (no pack has them; `tools/blender/shrine_pieces.py`):
  - **Vermilion torii:** inside every doorway, and across its paths. You walk under them; their posts are solid.
  - **Lanterns:** stone lanterns (their windows glowing), and red paper lanterns hung on the walls in place of torches,
    with no flames.
  - **Plants:** bamboo clumps, and maples and pines (More_nature's).
  - **Buildings:** small shrines, the shrine hall (its straw rope and paper zigzags, an offering box), a five-tier
    pagoda and a bell tower.
  - **Grounds:** raked gravel; a dojo's planks, training dummies and weapon racks; mossy rocks for low cover.
  - **Ponds:** deep water (what falls in drowns) crossed by plank bridges, red railings along the water (you can't fall
    off them).
- **Its rooms:**
  - Nine fight rooms: **the torii path**, **the sakura grove**, **the zen garden**, **the koi pond**, **the bamboo
    forest**, **the dojo**, **the lantern steps** (stone terraces, perches), **the pagoda court** and **the tea garden**.
  - Its boss room is **the Great Shrine**: four great sakura, lanterns, a great torii over each way in.
  - Every floor cell is reachable, and the lanes between blocks are wide enough for large enemies.

## What was built
- **Kit:** `tools/blender/shrine_pieces.py` (new); `export_dungeon_kit.py --shrine <More_nature>`. The kit is
  `public/models/dungeon/kit.glb`: 33 pieces more, 15.9 MB (was 14.5).
- **World:**
  - `world/dungeon/shrine.ts` (new: set pieces, blocks, dressing, door torii, bridges) and `shrineRooms.ts` (new).
  - `shrineStyle.ts` (new: the look) and `baseStyles.ts` (new: brick and stone, out of `styles.ts`).
  - `rooms.ts` (its letters), `assemble.ts`, `ownDressing.ts`, `dressExtras.ts`, `dressing.ts` (a look's own wall
    piece in place of torches), `styleTypes.ts` (`cutout`, `torch`), `floorOrder.ts` (built).
- **Engine:** `engine/shrine/shrineSky.ts` (new), `depthsView.ts`, `motesView.ts` (petals), `gardenView.ts` (petal
  carpets), `kitMaterial.ts` (leaves cut out).
- **Elsewhere:** `screens/labLists.ts`; `tools/dungeon-shots.ts` (looks into its rooms).
- **Tests:** `test-shrine.ts` (new), `test-lab.ts`.

## Checked without a browser
- **Tests:** the rooms; 16 floors walked, with no cell cut off and no pocket that small or large enemies can't reach;
  every piece in the kit; the trees in earth; the petals; the torii posts solid and the way under them open; every
  bridge edge railed; the look; the sky's islands.
- **Renders in Blender:** the pieces and the trees, and floor 8's rooms with the real kit in daylight.
- **Not yet seen in the game:** three.js's look of it (the cut-out leaves, the petals, the islands, the haze) and its
  frame rate with the bigger kit.

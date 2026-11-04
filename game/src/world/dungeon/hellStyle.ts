// Update 0.3.43 — floor 10's look, Hell on Earth (MD/FLOOR10_HELL_PLAN.md; the designer: "Go with your mix", then
// "Agreed, start"): the Forge's rooms and machinery (0.3.13) turned to Hell's. Floor 3's stone turned to basalt, near
// black and glossy, with seams of lava glowing through it (engine/hell/cracks.ts), hottest at the walls' feet; the
// paving a dark red-brown so the black iron and the orange lava stand out on it. A furnace sky, red-orange, lit from
// below (engine/hell/hellSky.ts), and still bright (the designer: keep play spaces bright): the light is hot and
// strong. Skulls on the walls, bones and glowing ore along them, basalt boulders for low cover, burnt trees in beds of
// ash; chains and braziers are hell.ts's. Pure data.
import type { DungeonStyle } from './styleTypes';
import { STONE } from './baseStyles';

/** Charred black (the trees, stumps and logs). */
const CHAR = 0x2a2420;

export const HELL_LOOK: DungeonStyle = {
  ...STONE,
  id: 'hell',
  // (A skull on the wall now and then, big enough to read across a room.)
  decor: 'kit_r_Skull2',
  decorY: 2.6,
  decorOut: 0.3,
  decorScale: [1.3, 1.3, 1.3],
  litter: ['kit_p1_Skull', 'kit_p2_Bones', 'kit_p2_Bones2', 'kit_r_Bone', 'kit_p2_Rock1', 'kit_p2_Rock4', 'kit_r_Mineral', 'kit_r_Skull'],
  core: [0.03, 0.02, 0.017],
  tint: {
    RockLight: 0x4d403b,
    Rock: 0x2e2523,
    Grey_Floor: 0x3d3230,
    Steel: 0x3a3230,
    DarkSteel: 0x262020,
    LightSteel: 0x6e625c,
    Metal: 0x48403c,
    DarkMetal: 0x2a2422,
    Bones: 0xcdb89c,
    Bone: 0xcdb89c,
    Beige: 0xcdb89c,
    Wood: 0x3d2b22,
    DarkWood: 0x2a1d18,
    LightWood: 0x5a4234,
    Green: 0x3a332c,
    Grey: 0x3a3230,
    Fire: 0xff6a1a,
    Pink: 0xff5a14,
  },
  // (The paving a red-brown, lighter than the walls, so the iron's black and the lava's orange stand out on it.)
  floorTint: { RockLight: 0x8a5d4a, Rock: 0x5e3a2f },
  sky: 0xf2a46c,
  skyLight: 0xffdcc0,
  // (The light from below: the lava's.)
  ground: 0xff7436,
  sun: 0xffc596,
  sand: 0x3a302b,
  quicksand: 0x2a2220,
  ash: 0x37312d,
  low: 'kit_n_Rock_5',
  lowScale: [2.8, 1.9, 2.1],
  glow: ['Pink'],
  burnt: { kit_n_CommonTree_Dead_2: CHAR, kit_n_CommonTree_Dead_3: CHAR, kit_n_BirchTree_Dead_3: CHAR, kit_n_TreeStump: CHAR, kit_n_WoodLog: CHAR, kit_n_Rock_5: 0x4a3c37 },
  ashBeds: true,
  cracks: { on: ['RockLight', 'Rock'], color: 0xff5a18 },
  gloss: { RockLight: 0.5, Rock: 0.45 },
};

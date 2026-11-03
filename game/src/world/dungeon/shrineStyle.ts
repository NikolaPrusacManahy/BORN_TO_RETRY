// Update 0.3.32 — floor 8, the Shrine Dimension (MD/FLOOR8_SHRINE_PLAN.md): floor 3's stone as pale castle stone and worn
// grey paving under a soft spring sky, a pale pink haze, a warm sun; beds of dark earth (`sand`) and moss (`ash`) for its
// trees; its ponds still and clear (`pit`); mossy rocks for low cover in beds of earth; red paper lanterns on the walls
// in place of torches (`torch`, `decor`), they and the stone lanterns' windows glowing (`glow`); its leaves cut out of
// their textures (`cutout`). Pure data.
import type { DungeonStyle } from './styleTypes';
import { STONE } from './baseStyles';

export const SHRINE_LOOK: DungeonStyle = {
  ...STONE,
  id: 'shrine',
  decor: 'kit_js_WallLantern',
  decorY: 2.3,
  decorOut: 0.42,
  torch: 'kit_js_WallLantern',
  litter: ['kit_n_Rock_Moss_1', 'kit_p2_Rock1', 'kit_n_Rock_Moss_6', 'kit_p2_Rock4'],
  core: [0.16, 0.15, 0.14],
  tint: { RockLight: 0xe2ddd2, Rock: 0xb2aca1, Steel: 0x4c3a2e, DarkSteel: 0x3a2c23, Bones: 0xeee6d6, Wood: 0x6e4a33, DarkWood: 0x4c3426, Grey_Floor: 0xc4beb2, Fire: 0xffa860 },
  floorTint: { RockLight: 0xcdc7bb, Rock: 0xaaa397 },
  sky: 0xbcdcf4,
  haze: 0xf4dde6,
  skyLight: 0xfff4f7,
  ground: 0xcab8a6,
  sun: 0xfff0dc,
  sand: 0x5c4535,
  ash: 0x6e8a4c,
  quicksand: 0x4a3a2c,
  pit: { base: 0x0d3438, deep: 0x1d7072, hot: 0x5cc0b4, glow: 0.1, calm: true },
  low: 'kit_n_Rock_Moss_4',
  lowScale: [2.3, 1.4, 2.3],
  lowBed: true,
  glow: ['LanternGlow', 'PaperRed'],
  cutout: ['Sakura', 'PineNeedle', 'MapleLeaf'],
};

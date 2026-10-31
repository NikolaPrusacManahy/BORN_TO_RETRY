// Update 0.2.4 (out of dressing.ts, which had reached its size) — the room dressing that isn't walls and floors: the
// shop's (Update 0.0.13: a red carpet before its tiles and a tall candelabrum at each end of them), and floor 4's
// desert cells (the designer: palms and cacti grow in sand, never out of paving): a palm or a cactus stands in a bed of
// loose sand (no paving under it); quicksand is loose sand you sink in (sandView.ts draws the sand). Pure.
// Update 0.2.10 — floor 5's willows, each in a bed of mud (the style's `sand` colour).
import type { Rng } from '../../core/rng';
import { CELL, cellX, cellZ, FloorPlan } from './floorPlan';
import type { Cell } from './rooms';

export type Put = (piece: string, x: number, y: number, z: number, rot?: number, sx?: number, sy?: number, sz?: number) => void;

/** A cell of loose sand: quicksand, or the bed a palm or a cactus stands in. */
export interface SandCell {
  x: number;
  z: number;
  quick: boolean;
}

/** The cells that are sand, not paving. */
export const SANDY: ReadonlySet<Cell> = new Set<Cell>(['sand', 'palm', 'cactus', 'willow']);

/** The desert's pieces (export_dungeon_kit.py's Nature pack ones), and their sizes in the game (the pack's palms are
 *  4–4.5 m, its cacti 1–2 m: scaled up to the rooms). */
export const DESERT = {
  palms: ['kit_n_PalmTree_1', 'kit_n_PalmTree_3'],
  cacti: ['kit_n_Cactus_1', 'kit_n_Cactus_3', 'kit_n_CactusFlowers_2'],
  palmScale: 1.6,
  cactusScale: 1.7,
  /** Update 0.2.10 — floor 5's weeping willows (2.4–2.9 m as they come). */
  willows: ['kit_n_Willow_1', 'kit_n_Willow_3', 'kit_n_Willow_Dead_2'],
  willowScale: 2.1,
};

const SHOP = { carpet: 'kit_p2_Carpet', candelabrum: 'kit_p2_Candelabrum_tall' };

/** The shop: a carpet in front of the row of tiles, a candelabrum at each end. */
export function dressShop(plan: FloorPlan, put: Put) {
  for (const r of plan.rooms) {
    const tiles = r.layout.tiles;
    if (r.kind !== 'shop' || tiles.length === 0) continue;
    const row = tiles[0][1];
    const along = tiles.every((t) => t[1] === row);
    const xs = tiles.map((t) => cellX(r.x0 + t[0]));
    const zs = tiles.map((t) => cellZ(r.z0 + t[1]));
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    // Towards the room's middle from the tiles.
    const inward = cellZ(r.z0 + r.layout.h / 2) - CELL / 2 > midZ ? 1 : -1;
    if (along) {
      put(SHOP.carpet, midX, 0.01, midZ + inward * 3.4, Math.PI / 2, 1.4, 1, 1.4);
      put(SHOP.candelabrum, Math.min(...xs) - CELL, 0, midZ);
      put(SHOP.candelabrum, Math.max(...xs) + CELL, 0, midZ);
    }
  }
}

/** Update 0.2.4 — a sand cell: its sand, and its palm or cactus in the middle (turned and sized a little at random). */
export function dressSand(c: Cell, x: number, z: number, rng: Rng, put: Put, sand: SandCell[]) {
  sand.push({ x, z, quick: c === 'sand' });
  const turn = rng() * Math.PI * 2;
  if (c === 'palm') {
    const s = DESERT.palmScale * (0.85 + 0.3 * rng());
    put(DESERT.palms[Math.floor(rng() * DESERT.palms.length)], x, 0, z, turn, s, s, s);
  } else if (c === 'cactus') {
    const s = DESERT.cactusScale * (0.85 + 0.3 * rng());
    put(DESERT.cacti[Math.floor(rng() * DESERT.cacti.length)], x, 0, z, turn, s, s, s);
  } else if (c === 'willow') {
    const s = DESERT.willowScale * (0.85 + 0.3 * rng());
    put(DESERT.willows[Math.floor(rng() * DESERT.willows.length)], x, 0, z, turn, s, s, s);
  }
}

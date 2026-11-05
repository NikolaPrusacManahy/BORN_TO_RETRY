// Update 0.2.24 — floor 3's Bone Keep dressed: an open grave (a bed of earth, the hole dark in it, a headstone at its
// head: part 2's stone slab stood on end), a bed of glowing mushrooms (drawn by engine/gardenView.ts), a burrow (a bed
// of earth and its hole), a cluster of the RPG pack's crystals (they glow: styles.ts `glow`); tall candelabra by the
// walls (more in the boss room). Pure.
import type { Rng } from '../../core/rng';
import { cellAt, cellX, cellZ, FloorPlan, GRID } from './floorPlan';
import type { Put, SandCell } from './dressExtras';
import type { Mark } from './gardenDressing';
import type { Cell } from './rooms';

export const KEEP_PIECES = {
  /** A headstone: the stone floor slab on end (0.7 m wide, 1.1 m tall, 0.14 m thick). */
  headstone: 'kit_p2_ModularFloor',
  headstoneScale: [0.34, 3, 0.07] as const,
  crystals: ['kit_r_Crystal1', 'kit_r_Crystal2', 'kit_r_Crystal5'],
  candelabrum: 'kit_p2_Candelabrum_tall',
};

/** Candelabra by the walls, this often (a floor cell beside a wall; the boss room's more). */
const CANDLES = 0.03;
const THRONE_CANDLES = 0.14;

/** Graves, mushroom beds and burrows: a bed of earth each, and what's in it. */
export function dressLair(c: Cell, x: number, z: number, rng: Rng, put: Put, sand: SandCell[], marks: { graves: Mark[]; burrows: Mark[]; shrooms: Mark[] }) {
  sand.push({ x, z, quick: false });
  if (c === 'grave') {
    marks.graves.push({ x, z: z + 0.15, rot: 0, s: 1.9 });
    const [sx, sy, sz] = KEEP_PIECES.headstoneScale;
    put(KEEP_PIECES.headstone, x, 0, z - 0.85, (rng() - 0.5) * 0.25, sx, sy, sz);
  } else if (c === 'burrow') {
    marks.burrows.push({ x, z, rot: rng() * Math.PI * 2, s: 1.5 });
  } else {
    const n = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) marks.shrooms.push({ x: x + (rng() - 0.5) * 1.6, z: z + (rng() - 0.5) * 1.6, rot: rng() * Math.PI * 2, s: 0.6 + 0.8 * rng() });
  }
}

/** A crystal cluster (its cell is a block: assemble.ts). */
export function dressCrystal(x: number, z: number, rng: Rng, put: Put) {
  for (let i = 0; i < 3; i++) {
    const s = (i === 0 ? 3.2 : 2.2) * (0.85 + 0.3 * rng());
    const piece = KEEP_PIECES.crystals[Math.floor(rng() * KEEP_PIECES.crystals.length)];
    put(piece, x + (i === 0 ? 0 : (rng() - 0.5) * 0.7), 0, z + (i === 0 ? 0 : (rng() - 0.5) * 0.7), rng() * Math.PI * 2, s, s, s);
  }
}

/** Candelabra by every room's walls (none near a door). */
export function dressKeep(plan: FloorPlan, inRoom: Int16Array, nearDoor: (col: number, row: number) => boolean, rng: Rng, put: Put) {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const room = inRoom[row * GRID + col];
      if (room < 0) continue;
      const boss = plan.rooms[room].kind === 'boss';
      const c = cellAt(plan, col, row);
      const x = cellX(col);
      const z = cellZ(row);
      if (c !== 'floor' || nearDoor(col, row) || rng() >= (boss ? THRONE_CANDLES : CANDLES)) continue;
      const w = [[0, -1], [0, 1], [-1, 0], [1, 0]].find(([dc, dr]) => cellAt(plan, col + dc, row + dr) === 'wall');
      if (w) put(KEEP_PIECES.candelabrum, x + w[0] * 0.45, 0, z + w[1] * 0.45, rng() * Math.PI * 2, 1.35, 1.35, 1.35);
    }
  }
}

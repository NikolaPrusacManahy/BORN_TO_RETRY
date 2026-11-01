// Update 0.2.23 — floor 2's Venom Garden dressed (out of dressing.ts, which had reached its size; the designer: trees and
// plants grow out of earth, never out of paving): a bed of earth with flowers, short grass and plants in it; a bed of
// tall grass (clumps as high as your chest: it parts round whatever walks through it, engine/gardenView.ts); a birch or
// a tree in its bed; webs on the floor (a sheet of web, the kit's cobwebs on it); thick cobwebs at the foot of the walls,
// thickest in the corners (the kit's cobweb sits on the floor, its back to a wall). In the boss room, the Scorched
// Grove, the beds are ash, the trees dead and charred (styles.ts `burnt`), stumps, logs and bones in the ash, and scorch
// marks on its paving. Pure.
import type { Rng } from '../../core/rng';
import { cellAt, cellX, cellZ, FloorPlan, GRID } from './floorPlan';
import type { Put, SandCell } from './dressExtras';
import type { Cell } from './rooms';

/** A mark on the floor: a web's sheet, or a scorch (its middle, its turn, its size, m). */
export interface Mark {
  x: number;
  z: number;
  rot: number;
  s: number;
}

export const VENOM_PIECES = {
  plants: ['kit_n_Flowers', 'kit_n_Grass_Short', 'kit_n_Plant_1', 'kit_n_Plant_5', 'kit_n_BushBerries_1', 'kit_n_Flowers', 'kit_n_Plant_2'],
  tall: ['kit_n_Grass', 'kit_n_Grass_2'],
  trees: ['kit_n_BirchTree_1', 'kit_n_BirchTree_2', 'kit_n_CommonTree_1', 'kit_n_CommonTree_2'],
  burnt: ['kit_n_CommonTree_Dead_2', 'kit_n_CommonTree_Dead_3', 'kit_n_BirchTree_Dead_3'],
  ash: ['kit_n_TreeStump', 'kit_n_WoodLog', 'kit_p2_Bones', 'kit_p1_Skull', 'kit_p2_Bones2'],
  webs: ['kit_p1_Cobweb', 'kit_p1_Cobweb2'],
  /** Sizes in the game: the trees (the pack's are 2.5–4 m), a clump of tall grass (1–1.2 m as it comes). */
  treeScale: 1.55,
  burntScale: 1.6,
};

/** Update 0.2.23 — the tall grass pieces: they part (engine/gardenView.ts). */
export const TALL_GRASS: ReadonlySet<string> = new Set(VENOM_PIECES.tall);

/** Clumps of tall grass in a bed; a cobweb at a wall's foot, and in a corner; a cell of paving scorched. */
const CLUMPS = 7;
const WALL_WEBS = 0.07;
const CORNER_WEBS = 0.6;
const SCORCH = 0.14;

const pick = (list: readonly string[], rng: Rng) => list[Math.floor(rng() * list.length)];

/** A bed's cell (earth, tall grass, a tree), or in the boss room its ash. */
export function dressBed(c: Cell, x: number, z: number, burnt: boolean, rng: Rng, put: Put, sand: SandCell[]) {
  const P = VENOM_PIECES;
  sand.push({ x, z, quick: false, ash: burnt });
  const turn = rng() * Math.PI * 2;
  if (burnt) {
    if (c === 'tree') {
      const s = P.burntScale * (0.85 + 0.3 * rng());
      put(pick(P.burnt, rng), x, 0, z, turn, s, s, s);
    } else if (rng() < 0.6) {
      const s = 1.1 + 0.4 * rng();
      put(pick(P.ash, rng), x + (rng() - 0.5) * 0.8, 0, z + (rng() - 0.5) * 0.8, turn, s, s, s);
    }
    return;
  }
  if (c === 'tree') {
    const s = P.treeScale * (0.85 + 0.3 * rng());
    put(pick(P.trees, rng), x, 0, z, turn, s, s, s);
  }
  if (c === 'grass') {
    for (let i = 0; i < CLUMPS; i++) {
      const tall = 1.3 + 0.4 * rng();
      const wide = 2.2 + 0.6 * rng();
      put(pick(P.tall, rng), x + (rng() - 0.5) * 1.7, 0, z + (rng() - 0.5) * 1.7, rng() * Math.PI * 2, wide, tall, wide);
    }
    return;
  }
  const n = c === 'tree' ? 2 : 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const s = 1 + 0.5 * rng();
    put(pick(P.plants, rng), x + (rng() - 0.5) * 1.5, 0, z + (rng() - 0.5) * 1.5, rng() * Math.PI * 2, s, s, s);
  }
}

/** A web's cell: its sheet, and a cobweb on it now and then. */
export function dressWeb(x: number, z: number, rng: Rng, put: Put, webs: Mark[]) {
  webs.push({ x: x + (rng() - 0.5) * 0.4, z: z + (rng() - 0.5) * 0.4, rot: rng() * Math.PI * 2, s: 2.3 + 0.6 * rng() });
  if (rng() < 0.5) {
    const s = 1.6 + 0.6 * rng();
    put(pick(VENOM_PIECES.webs, rng), x + (rng() - 0.5) * 0.6, 0, z + (rng() - 0.5) * 0.6, rng() * Math.PI * 2, s, s, s);
  }
}

/** Every room's cobwebs at the walls' feet (none near a door), and its boss room's scorch marks. `inRoom`: each cell's
 *  room (−1: none). */
export function dressGarden(plan: FloorPlan, inRoom: Int16Array, nearDoor: (col: number, row: number) => boolean, rng: Rng, put: Put, scorch: Mark[]) {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const room = inRoom[row * GRID + col];
      if (room < 0 || cellAt(plan, col, row) !== 'floor' || nearDoor(col, row)) continue;
      const x = cellX(col);
      const z = cellZ(row);
      if (plan.rooms[room].kind === 'boss' && rng() < SCORCH) scorch.push({ x: x + (rng() - 0.5), z: z + (rng() - 0.5), rot: rng() * Math.PI * 2, s: 2 + 2.5 * rng() });
      // The walls beside it: the cobweb's back (−z) to one of them.
      const n = cellAt(plan, col, row - 1) === 'wall';
      const s = cellAt(plan, col, row + 1) === 'wall';
      const w = cellAt(plan, col - 1, row) === 'wall';
      const e = cellAt(plan, col + 1, row) === 'wall';
      const corner = (n || s) && (w || e);
      if (!(n || s || w || e) || rng() >= (corner ? CORNER_WEBS : WALL_WEBS)) continue;
      const rot = n ? 0 : s ? Math.PI : w ? Math.PI / 2 : -Math.PI / 2;
      const dx = w ? -1 : e ? 1 : 0;
      const dz = n ? -1 : s ? 1 : 0;
      const k = (corner ? 2.6 : 2) * (0.85 + 0.3 * rng());
      put(pick(VENOM_PIECES.webs, rng), x + dx * 0.4, 0, z + dz * 0.4, rot, k, k, k);
    }
  }
}

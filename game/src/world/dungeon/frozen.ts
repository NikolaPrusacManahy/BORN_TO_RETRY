// Update 0.3.11 — floor 7's, Frozen Depths: where its icicles hang (along every fight room's walls, under their caps,
// now and then, never by a door) and its snowy dressing (frozenRooms.ts: F a snowy tree in a bed of snow, n a bed of
// snow with a stump, a rock or a bush now and then). The ice is assemble.ts's (flat areas, as quicksand). Pure.
import { createRng, Rng } from '../../core/rng';
import type { Put, SandCell } from './dressExtras';
import { CELL, cellAt, cellX, cellZ, FloorPlan } from './floorPlan';
import type { Cell } from './rooms';

/** An icicle: where it hangs (just off the wall's face, under the cap) and falls straight down onto; its room. */
export interface IcicleSpot {
  x: number;
  z: number;
  room: number;
}

/** One wall cell in this many may have one, at this chance; none this near a door's middle (cells); this far out from
 *  the wall's face it hangs (m). */
const EVERY = 3;
const CHANCE = 0.55;
const DOOR_CLEAR = 3;
const OUT = 0.25;

/** The snowy pieces (export_dungeon_kit.py's), and their sizes in the game (the pack's trees are 2.5–4 m as they come). */
export const FROZEN = {
  trees: ['kit_n_PineTree_Snow_1', 'kit_n_PineTree_Snow_3', 'kit_n_PineTree_Snow_5', 'kit_n_PineTree_Snow_3', 'kit_n_BirchTree_Snow_2', 'kit_n_CommonTree_Snow_1', 'kit_n_CommonTree_Dead_Snow_2', 'kit_n_BirchTree_Dead_Snow_3'],
  treeScale: 1.75,
  bedThings: ['kit_n_TreeStump_Snow', 'kit_n_Rock_Snow_1', 'kit_n_Rock_Snow_3', 'kit_n_Bush_Snow_1', 'kit_n_WoodLog_Snow'],
};

/** The icicles of floor `plan` (only its fight rooms: none on a floor that isn't frozen, `frozen` false). */
export function iciclesOf(plan: FloorPlan, frozen: boolean): IcicleSpot[] {
  const out: IcicleSpot[] = [];
  if (!frozen) return out;
  const rng = createRng(plan.seed * 37 + plan.level * 11);
  for (const r of plan.rooms) {
    if (r.kind !== 'fight') continue;
    const { w, h } = r.layout;
    // Round its inside, each cell against the wall: (col, row) inside, and the way out to the wall.
    const sides: [number, number, number, number, number][] = [];
    for (let c = 0; c < w; c++) sides.push([c, 0, 0, -1, Math.abs(c - (w - 1) / 2)], [c, h - 1, 0, 1, Math.abs(c - (w - 1) / 2)]);
    for (let row = 0; row < h; row++) sides.push([0, row, -1, 0, Math.abs(row - (h - 1) / 2)], [w - 1, row, 1, 0, Math.abs(row - (h - 1) / 2)]);
    sides.forEach(([c, row, dx, dz, fromMiddle], i) => {
      if (i % EVERY !== 0 || fromMiddle < DOOR_CLEAR || rng() > CHANCE) return;
      const col = r.x0 + c;
      const rw = r.z0 + row;
      if (cellAt(plan, col, rw) !== 'floor' || cellAt(plan, col + dx, rw + dz) !== 'wall') return;
      out.push({ x: cellX(col) + dx * (CELL / 2 - OUT), z: cellZ(rw) + dz * (CELL / 2 - OUT), room: r.index });
    });
  }
  return out;
}

/** A snowy cell: a tree in its bed of snow, or the bed itself with a stump, a rock, a bush or a log now and then. */
export function dressFrozen(c: Cell, x: number, z: number, rng: Rng, put: Put, sand: SandCell[]) {
  sand.push({ x, z, quick: false });
  const turn = rng() * Math.PI * 2;
  if (c === 'pine') {
    const s = FROZEN.treeScale * (0.85 + 0.3 * rng());
    put(FROZEN.trees[Math.floor(rng() * FROZEN.trees.length)], x, 0, z, turn, s, s, s);
  } else if (rng() < 0.45) {
    const s = 1.1 + 0.5 * rng();
    put(FROZEN.bedThings[Math.floor(rng() * FROZEN.bedThings.length)], x + (rng() - 0.5) * 0.8, 0, z + (rng() - 0.5) * 0.8, turn, s, s, s);
  }
}

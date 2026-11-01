// Update 0.2.23 — floor 2's Venom Garden in the level (assemble.ts): its webs (areas of the floor that slow you:
// sim/dungeon/quicksand.ts) and its wasps' hives, each on the wall beside an `h` of its room, at HIVE_Y (they let wasps
// out while their room fights: sim/dungeon/hives.ts). Pure.
import type { ArenaBox } from '../arena';
import { cellsBox, merge } from './cellBoxes';
import { CELL, cellAt, cellX, cellZ, FloorPlan } from './floorPlan';

export interface HiveSpot {
  room: number;
  x: number;
  y: number;
  z: number;
  /** The way out of its wall, into the room. */
  nx: number;
  nz: number;
}

/** A hive's middle: this high (m), this far out from its wall's face. */
export const HIVE_Y = 2.4;
export const HIVE_OUT = 0.5;

const DIRS: [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** The webs' areas (flat boxes on the floor). */
export function websOf(plan: FloorPlan): ArenaBox[] {
  const out: ArenaBox[] = [];
  merge(plan, (c) => c === 'web', (col, row, w, h) => cellsBox(col, row, w, h, -0.1, 0.1, 'accent'), out);
  return out;
}

/** Every room's hives: on the first wall beside each of its `h` cells. */
export function hivesOf(plan: FloorPlan): HiveSpot[] {
  const out: HiveSpot[] = [];
  for (const r of plan.rooms) {
    for (const [c, row] of r.layout.hives) {
      const col = r.x0 + c;
      const z0 = r.z0 + row;
      const d = DIRS.find(([dc, dr]) => cellAt(plan, col + dc, z0 + dr) === 'wall');
      if (!d) continue;
      const reach = CELL / 2 - HIVE_OUT;
      out.push({ room: r.index, x: cellX(col) + d[0] * reach, y: HIVE_Y, z: cellZ(z0) + d[1] * reach, nx: -d[0], nz: -d[1] });
    }
  }
  return out;
}

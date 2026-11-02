// Update 0.3.10 — every column a pillar the pillar finisher can break (sim/combat/pillars.ts): each its own box, as wide
// as its stone, so a broken one's can change alone. (Moved out of assemble.ts in Update 0.3.11: it had reached 300
// lines.) Pure.
import type { Arena, ArenaBox } from '../arena';
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID } from './floorPlan';
import { styleOf } from './styles';

/** The Throne Hall's skulls stand out this far (m) from its pillars' middles (keepDressing.ts). */
const SKULL_PILLAR = 0.85;

/** Half a column's side: its look's stone; the Throne Hall's, with the skulls round it. */
function columnHalf(plan: FloorPlan, col: number, row: number): number {
  const look = styleOf(plan.level);
  const throne = look.id === 'bone' && plan.rooms.some((r) => r.kind === 'boss' && col >= r.x0 && col < r.x0 + r.layout.w && row >= r.z0 && row < r.z0 + r.layout.h);
  return throne ? SKULL_PILLAR : (look.columnHalf ?? CELL / 2);
}

/** Each column cell's box (`h` high) into `boxes`; the pillars, each with its box's index. */
export function columnBoxes(plan: FloorPlan, h: number, boxes: ArenaBox[]): NonNullable<Arena['pillars']> {
  const pillars: NonNullable<Arena['pillars']> = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (cellAt(plan, col, row) !== 'column') continue;
      const half = columnHalf(plan, col, row);
      boxes.push({ x: cellX(col), y: h / 2, z: cellZ(row), w: 2 * half, h, d: 2 * half, kind: 'block' });
      pillars.push({ x: cellX(col), z: cellZ(row), half, h, box: boxes.length - 1 });
    }
  }
  return pillars;
}

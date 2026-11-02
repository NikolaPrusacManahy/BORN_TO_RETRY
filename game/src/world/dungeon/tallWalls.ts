// Update 0.3.16 — a boss room with taller walls (floor 6's, the Big Shark's arena: the designer, "the walls are 50%
// higher", its water nearly to their top): every cell in the ring round its inside (its walls, its doorway, the way
// out) stands `DungeonStyle.bossWalls` rows of the kit's wall high instead of three. Their faces and caps (dressing.ts),
// their cores (cores.ts), and what's solid over the ring up there (assemble.ts: nobody swims out over a gate). Pure.
import type { ArenaBox } from '../arena';
import { cellsBox } from './cellBoxes';
import { FloorPlan, GRID } from './floorPlan';
import { styleOf } from './styles';

/** The kit's wall piece (m) and the rows a wall has elsewhere. */
export const WALL_PIECE = 2;
export const ROWS = 3;

/** The ring round the boss room's inside (1: in it), or null when its walls stand as any other's. */
export function tallRing(plan: FloorPlan): Uint8Array | null {
  const rows = styleOf(plan.level).bossWalls;
  const r = plan.rooms.find((x) => x.kind === 'boss');
  if (!rows || !r) return null;
  const ring = new Uint8Array(GRID * GRID);
  const { w, h } = r.layout;
  for (let row = r.z0 - 1; row <= r.z0 + h; row++) {
    for (let col = r.x0 - 1; col <= r.x0 + w; col++) {
      const edge = row === r.z0 - 1 || row === r.z0 + h || col === r.x0 - 1 || col === r.x0 + w;
      if (edge && col >= 0 && row >= 0 && col < GRID && row < GRID) ring[row * GRID + col] = 1;
    }
  }
  return ring;
}

/** How many rows of the kit's wall the cell stands (a part row last: scaled). */
export function rowsAt(plan: FloorPlan, ring: Uint8Array | null, col: number, row: number): number {
  return ring && ring[row * GRID + col] ? (styleOf(plan.level).bossWalls ?? ROWS) : ROWS;
}

/** What's solid over the ring, from the other walls' top to its own: four strips round the boss room. */
export function tallBoxes(plan: FloorPlan, boxes: ArenaBox[]) {
  const rows = styleOf(plan.level).bossWalls;
  const r = plan.rooms.find((x) => x.kind === 'boss');
  if (!rows || !r) return;
  const { w, h } = r.layout;
  const y0 = ROWS * WALL_PIECE;
  const y1 = rows * WALL_PIECE;
  boxes.push(cellsBox(r.x0 - 1, r.z0 - 1, w + 2, 1, y0, y1, 'wall'));
  boxes.push(cellsBox(r.x0 - 1, r.z0 + h, w + 2, 1, y0, y1, 'wall'));
  boxes.push(cellsBox(r.x0 - 1, r.z0, 1, h, y0, y1, 'wall'));
  boxes.push(cellsBox(r.x0 + w, r.z0, 1, h, y0, y1, 'wall'));
}

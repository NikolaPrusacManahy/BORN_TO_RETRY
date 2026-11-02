// Update 0.0.13 (moved out of dressing.ts in Update 0.2.9, which had grown past its size) — the solid cores inside the
// walls and ledges (the designer saw the sky through them in daylight): the kit's brick faces have jagged edges, so where
// two meet at a corner, or a wall meets the floor, notches opened onto the empty cell behind. A plain dark block fills
// each wall and ledge cell, set just behind its faces (only on the sides that have faces: next to another wall it
// reaches the cell's edge, so no crack runs through), so a notch shows shadow. Pure.
import { HEIGHT, LAVA_DEPTH } from './assemble';
import type { ArenaBox } from '../arena';
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID } from './floorPlan';
import type { Cell } from './rooms';
import { ROWS, rowsAt, tallRing, WALL_PIECE } from './tallWalls';

/** A core sits this far behind its faces' fronts (inside their depth), from below the floor to just under the top: the
 *  wall's caps, or a ledge's top tiles (0.25 thick). */
export const CORE_INSET = 0.2;
export const CORE_BOTTOM = -0.5;
const CORE_TOP_GAP: Partial<Record<Cell, number>> = { wall: 0.02, ledge: 0.3, highLedge: 0.3 };

/** Ground you can see from (not the void outside, a wall, the dark beyond the wooden gate). */
export const surface = (c: Cell) => c !== 'void' && c !== 'wall' && c !== 'dark';
const height = (c: Cell) => HEIGHT[c] ?? 0;

/** A core for every wall and ledge cell, pulled back from each side that has faces (one that looks onto lower ground).
 *  Update 0.2.9 — and the feet under them (feetOf), after them. */
export function coresOf(plan: FloorPlan): ArenaBox[] {
  const cores: ArenaBox[] = [];
  // (Update 0.3.16 — round a tall boss room, taller; over its doorways too: tallWalls.ts.)
  const tall = tallRing(plan);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const c = cellAt(plan, col, row);
      const rows = rowsAt(plan, tall, col, row);
      if (rows > ROWS && c !== 'wall' && c !== 'void') cores.push({ x: cellX(col), y: (HEIGHT.wall! + rows * WALL_PIECE) / 2, z: cellZ(row), w: CELL * 0.5, h: rows * WALL_PIECE - HEIGHT.wall! - 0.02, d: CELL * 0.5, kind: 'wall' });
      const h = c === 'wall' ? (rows * WALL_PIECE * HEIGHT.wall!) / (ROWS * WALL_PIECE) : solidTop(c);
      if (h === 0) continue;
      const w0 = faced(plan, col, row, -1, 0) ? CORE_INSET : 0;
      const w1 = faced(plan, col, row, 1, 0) ? CORE_INSET : 0;
      const d0 = faced(plan, col, row, 0, -1) ? CORE_INSET : 0;
      const d1 = faced(plan, col, row, 0, 1) ? CORE_INSET : 0;
      const y1 = h - CORE_TOP_GAP[c]!;
      cores.push({ x: cellX(col) + (w0 - w1) / 2, y: (CORE_BOTTOM + y1) / 2, z: cellZ(row) + (d0 - d1) / 2, w: CELL - w0 - w1, h: y1 - CORE_BOTTOM, d: CELL - d0 - d1, kind: 'wall' });
    }
  }
  return [...cores, ...feetOf(plan)];
}

/** How high a wall or ledge cell's top is (0: not one). */
const solidTop = (c: Cell) => (c === 'wall' ? HEIGHT.wall! : c === 'ledge' || c === 'highLedge' ? height(c) : 0);

/** A wall or ledge cell's side has faces when the cell beside it is lower ground (as the faces are placed above: not the
 *  void outside, not a doorway, whose arch covers it). */
function faced(plan: FloorPlan, col: number, row: number, dc: number, dr: number): boolean {
  const n = cellAt(plan, col + dc, row + dr);
  return surface(n) && n !== 'door' && solidTop(n) < solidTop(cellAt(plan, col, row));
}

/** Update 0.2.9 — the designer saw the sky in a pale line along the foot of walls, at their corners and down the
 *  corridors: under the floor's level nothing filled the core's set-back behind the brick faces (the slab under the floor
 *  stops at the wall), so the sky showed through where the bricks and the floor's edge don't meet. A foot under every
 *  wall and ledge cell fills it right up to its faces (FOOT_GAP behind them), from below a pit's lava to just under the
 *  floor; a floor cell at a lava pit's edge gets one behind its faces down to the lava, under its tile. */
const FOOT_GAP = 0.01;
const FOOT_TOP = -0.02;
const FOOT_BOTTOM = -LAVA_DEPTH - 0.5;
/** Under a floor tile (the stone floor's is the thickest, 0.37). */
const UNDER_TILE = -0.4;

function feetOf(plan: FloorPlan): ArenaBox[] {
  const feet: ArenaBox[] = [];
  const box = (col: number, row: number, gaps: [number, number, number, number], y1: number): ArenaBox => {
    const [w0, w1, d0, d1] = gaps;
    return { x: cellX(col) + (w0 - w1) / 2, y: (FOOT_BOTTOM + y1) / 2, z: cellZ(row) + (d0 - d1) / 2, w: CELL - w0 - w1, h: y1 - FOOT_BOTTOM, d: CELL - d0 - d1, kind: 'wall' };
  };
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const c = cellAt(plan, col, row);
      if (solidTop(c) > 0) {
        const gap = (dc: number, dr: number) => (faced(plan, col, row, dc, dr) ? FOOT_GAP : 0);
        feet.push(box(col, row, [gap(-1, 0), gap(1, 0), gap(0, -1), gap(0, 1)], FOOT_TOP));
      } else if (surface(c) && c !== 'lava') {
        const pit = (dc: number, dr: number) => (cellAt(plan, col + dc, row + dr) === 'lava' ? CORE_INSET : 0);
        const gaps: [number, number, number, number] = [pit(-1, 0), pit(1, 0), pit(0, -1), pit(0, 1)];
        if (gaps.some((g) => g > 0)) feet.push(box(col, row, gaps, UNDER_TILE));
      }
    }
  }
  return feet;
}

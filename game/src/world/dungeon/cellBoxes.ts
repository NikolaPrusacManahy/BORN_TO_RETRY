// Update 0.2.23 (out of assemble.ts, which had reached its size) — a floor plan's cells as boxes: cells of a kind merged
// into rectangles, and the box over a rectangle of cells. Pure.
import type { ArenaBox, BoxKind } from '../arena';
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID } from './floorPlan';
import type { Cell } from './rooms';

/** Cells matching `match` merged into rectangles (greedy, row by row), each made into a box by `box`. */
export function merge(plan: FloorPlan, match: (c: Cell) => boolean, box: (col: number, row: number, w: number, h: number, c: Cell) => ArenaBox, out: ArenaBox[]) {
  const done = new Uint8Array(GRID * GRID);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const c = cellAt(plan, col, row);
      if (done[row * GRID + col] || !match(c)) continue;
      let w = 1;
      while (col + w < GRID && !done[row * GRID + col + w] && cellAt(plan, col + w, row) === c) w++;
      let h = 1;
      const rowFits = (r: number) => {
        for (let k = 0; k < w; k++) if (done[r * GRID + col + k] || cellAt(plan, col + k, r) !== c) return false;
        return true;
      };
      while (row + h < GRID && rowFits(row + h)) h++;
      for (let r = row; r < row + h; r++) for (let k = col; k < col + w; k++) done[r * GRID + k] = 1;
      out.push(box(col, row, w, h, c));
    }
  }
}

/** A box over cells (col, row)…(col + w − 1, row + h − 1) from y0 to y1. */
export function cellsBox(col: number, row: number, w: number, h: number, y0: number, y1: number, kind: BoxKind): ArenaBox {
  return { x: cellX(col) + ((w - 1) * CELL) / 2, y: (y0 + y1) / 2, z: cellZ(row) + ((h - 1) * CELL) / 2, w: w * CELL, h: y1 - y0, d: h * CELL, kind };
}

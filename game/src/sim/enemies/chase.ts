// Update 0.0.11 — the way to the player for floor-bound enemies (world/navGrid.ts). A flow field holds, for every free
// cell, how many steps it is from the player's cell (breadth-first, eight ways, never cutting a blocked corner); it's
// redone when the player crosses into another cell. An enemy that can walk straight at the player does; otherwise it
// heads for the farthest cell down the flow it can walk straight to, so it rounds corners instead of hugging them.
// With the player out of reach (on a block, say) the flow leads to the nearest free spot below them, and stops there.
import type { Vector3 } from 'three';
import { NavGrid, colOf, freeCell, hasCells, lineClear, rowOf } from '../../world/navGrid';

export interface Flow {
  /** Steps from the target, per cell (−1: no way there). */
  dist: Int32Array;
  queue: Int32Array;
  /** The cell it was worked out for (−1: not yet). */
  target: number;
}

export type ChaseWay = 'straight' | 'path' | 'none';

/** How many cells down the flow an enemy looks for one it can run straight to. */
const LOOK = 10;
/** How far round the player's cell to look for a free one when it's blocked (cells): you up on a block, say. */
const NEAREST = 20;
const DC = [1, -1, 0, 0, 1, 1, -1, -1];
const DR = [0, 0, 1, -1, 1, -1, 1, -1];

export function createFlow(g: NavGrid): Flow {
  const n = g.cols * g.rows;
  return { dist: new Int32Array(n).fill(-1), queue: new Int32Array(n), target: -1 };
}

const clampCol = (g: NavGrid, x: number) => Math.max(0, Math.min(g.cols - 1, colOf(g, x)));
const clampRow = (g: NavGrid, z: number) => Math.max(0, Math.min(g.rows - 1, rowOf(g, z)));

/** Update 0.0.13 — the middle of the free cell nearest (x, z) (within a few metres) into `out`; false if none. */
export function freeSpotNear(g: NavGrid, x: number, z: number, out: Vector3): boolean {
  if (!hasCells(g)) {
    out.set(x, out.y, z);
    return true;
  }
  const n = nearestFree(g, clampCol(g, x), clampRow(g, z), NEAREST);
  if (n < 0) return false;
  out.set(centreX(g, n % g.cols), out.y, centreZ(g, Math.floor(n / g.cols)));
  return true;
}

/** The free cell nearest (col, row) within `reach` cells (its index), or −1. */
function nearestFree(g: NavGrid, col: number, row: number, reach: number): number {
  if (freeCell(g, col, row)) return row * g.cols + col;
  for (let ring = 1; ring <= reach; ring++) {
    let best = -1;
    let bestD = Infinity;
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring || !freeCell(g, col + dc, row + dr)) continue;
        const d = dc * dc + dr * dr;
        if (d < bestD) {
          bestD = d;
          best = (row + dr) * g.cols + col + dc;
        }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** A diagonal step only where both cells beside it are free (no squeezing past a corner). */
function canStep(g: NavGrid, col: number, row: number, k: number): boolean {
  const nc = col + DC[k];
  const nr = row + DR[k];
  if (!freeCell(g, nc, nr)) return false;
  return k < 4 || (freeCell(g, nc, row) && freeCell(g, col, nr));
}

/** Re-works the flow towards (x, z) if that's in another cell than last time. */
export function updateFlow(f: Flow, g: NavGrid, x: number, z: number) {
  if (!hasCells(g)) return;
  const cell = clampRow(g, z) * g.cols + clampCol(g, x);
  if (cell === f.target) return;
  f.target = cell;
  f.dist.fill(-1);
  const seed = nearestFree(g, cell % g.cols, Math.floor(cell / g.cols), NEAREST);
  if (seed < 0) return;
  f.dist[seed] = 0;
  f.queue[0] = seed;
  let head = 0;
  let tail = 1;
  while (head < tail) {
    const i = f.queue[head++];
    const col = i % g.cols;
    const row = Math.floor(i / g.cols);
    for (let k = 0; k < 8; k++) {
      if (!canStep(g, col, row, k)) continue;
      const n = (row + DR[k]) * g.cols + col + DC[k];
      if (f.dist[n] >= 0) continue;
      f.dist[n] = f.dist[i] + 1;
      f.queue[tail++] = n;
    }
  }
}

const centreX = (g: NavGrid, col: number) => g.minX + (col + 0.5) * g.cell;
const centreZ = (g: NavGrid, row: number) => g.minZ + (row + 0.5) * g.cell;

/** Which way an enemy at `from` should run for (tx, tz): writes a flat unit direction into `out`. */
export function chaseDir(f: Flow, g: NavGrid, from: Vector3, tx: number, tz: number, out: Vector3): ChaseWay {
  if (!hasCells(g) || lineClear(g, from.x, from.z, tx, tz)) {
    out.set(tx - from.x, 0, tz - from.z);
    const len = out.length();
    if (len > 1e-6) out.divideScalar(len);
    return 'straight';
  }
  let col = colOf(g, from.x);
  let row = rowOf(g, from.z);
  // Pressed into a wall's margin: first back out to the nearest free cell.
  if (!freeCell(g, col, row)) {
    const n = nearestFree(g, col, row, 2);
    if (n < 0) return 'none';
    return aim(g, from, n % g.cols, Math.floor(n / g.cols), out);
  }
  if (f.dist[row * g.cols + col] < 0) return 'none';
  let aimCol = -1;
  let aimRow = -1;
  for (let step = 0; step < LOOK; step++) {
    const here = f.dist[row * g.cols + col];
    let next = -1;
    for (let k = 0; k < 8; k++) {
      if (!canStep(g, col, row, k)) continue;
      const d = f.dist[(row + DR[k]) * g.cols + col + DC[k]];
      if (d >= 0 && d < here && (next < 0 || d < f.dist[(row + DR[next]) * g.cols + col + DC[next]])) next = k;
    }
    if (next < 0) break;
    col += DC[next];
    row += DR[next];
    if (aimCol >= 0 && !lineClear(g, from.x, from.z, centreX(g, col), centreZ(g, row))) break;
    aimCol = col;
    aimRow = row;
  }
  if (aimCol < 0) return 'none';
  return aim(g, from, aimCol, aimRow, out);
}

function aim(g: NavGrid, from: Vector3, col: number, row: number, out: Vector3): ChaseWay {
  out.set(centreX(g, col) - from.x, 0, centreZ(g, row) - from.z);
  const len = out.length();
  if (len > 1e-6) out.divideScalar(len);
  return 'path';
}

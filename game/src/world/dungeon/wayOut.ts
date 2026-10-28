// Update 0.0.15 — the way down from a floor (the designer: a wooden gate that leads to the dark): a doorway in the middle
// of the boss room's far wall, opposite the door you came in by, and beyond it a short dead end of dark, walled round,
// stamped onto the floor's grid over empty ground (the board's margin leaves room for it at the edge). Pure.
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID, PlacedRoom, Side } from './floorPlan';
import type { Cell } from './rooms';

/** How deep the dark beyond the wooden gate goes (cells). */
export const DARK_DEPTH = 2;

export const OPPOSITE: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' };

/** The side of the boss room its wooden gate is in, the middle of its doorway (world m), and the dark beyond (cells,
 *  inclusive). */
export interface WayOut {
  room: number;
  side: Side;
  doorX: number;
  doorZ: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export const NO_WAY_OUT: WayOut = { room: 0, side: 'n', doorX: 0, doorZ: 0, x0: 0, z0: 0, x1: 0, z1: 0 };

/** The gate's doorway in the boss room `r`'s far wall, the dark beyond it, walled round (only over empty ground). */
export function stampWayOut(plan: FloorPlan, r: PlacedRoom): WayOut {
  const side = OPPOSITE[r.doors[0]];
  const { w, h } = r.layout;
  const ns = side === 'n' || side === 's';
  // Outward from the room, and across the doorway.
  const [ox, oz] = side === 'n' ? [0, -1] : side === 's' ? [0, 1] : side === 'w' ? [-1, 0] : [1, 0];
  const wallCol = side === 'w' ? r.x0 - 1 : side === 'e' ? r.x0 + w : r.x0 + w / 2 - 1;
  const wallRow = side === 'n' ? r.z0 - 1 : side === 's' ? r.z0 + h : r.z0 + h / 2 - 1;
  const at = (d: number, k: number): [number, number] => (ns ? [wallCol + k, wallRow + oz * d] : [wallCol + ox * d, wallRow + k]);
  const put = (d: number, k: number, c: Cell) => {
    const [col, row] = at(d, k);
    if (c !== 'wall' || cellAt(plan, col, row) === 'void') plan.cells[row * GRID + col] = c;
  };
  for (const k of [0, 1]) {
    put(0, k, 'door');
    // The way to it inside the room kept clear, as for any door.
    for (const d of [-1, -2]) put(d, k, 'floor');
    for (let d = 1; d <= DARK_DEPTH; d++) put(d, k, 'dark');
  }
  for (let d = 1; d <= DARK_DEPTH + 1; d++) for (const k of d > DARK_DEPTH ? [-1, 0, 1, 2] : [-1, 2]) put(d, k, 'wall');
  const [ax, az] = at(1, 0);
  const [bx, bz] = at(DARK_DEPTH, 1);
  const doorX = ns ? cellX(wallCol) + CELL / 2 : cellX(wallCol);
  const doorZ = ns ? cellZ(wallRow) : cellZ(wallRow) + CELL / 2;
  return { room: r.index, side, doorX, doorZ, x0: Math.min(ax, bx), z0: Math.min(az, bz), x1: Math.max(ax, bx), z1: Math.max(az, bz) };
}

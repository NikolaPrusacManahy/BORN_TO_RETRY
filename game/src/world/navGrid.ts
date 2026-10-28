// Update 0.0.11 — where a floor-bound enemy can go, worked out once from an arena (the designer: grunts ran into
// walls forever and got stuck in blocks). The floor is cut into square cells; a cell is blocked off the floor, or
// where a body of `radius` standing there would touch a wall: any box whose top is above a step and whose bottom is
// below head height, and spike strips. The walls' floor footprints push a body back out; line tests run over the grid. Pure.
// Update 0.0.13 — a grid for fliers too (`AIR`): only what reaches up to where they fly blocks them (walls, columns);
// they pass over crates, broken columns, ledges and spikes.
import { Quaternion, Vector3 } from 'three';
import type { Arena, ArenaBox } from './arena';

/** A box's footprint on the floor (m). */
export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface NavGrid {
  /** The floor's height, and the body's radius the cells were blocked for. */
  floorY: number;
  radius: number;
  cell: number;
  minX: number;
  minZ: number;
  /** 0 × 0: no floor was found, so everywhere is open (rule tests on a bare plane). */
  cols: number;
  rows: number;
  /** 1 = blocked, per cell (row-major: index = row · cols + col). */
  blocked: Uint8Array;
  walls: Footprint[];
}

/** A body taller than this many metres above its feet is blocked by a box's bottom; anything lower than STEP isn't
 *  a wall. */
const HEAD = 2;
const STEP = 0.3;

/** Which boxes block: those reaching above `low` and starting below `high` (m above the floor); spikes too, if
 *  `hazards`. */
export interface NavBand {
  low: number;
  high: number;
  hazards: boolean;
}

/** On foot (the default), and flying (Update 0.0.13: fliers keep above 3 m). */
export const FOOT: NavBand = { low: STEP, high: HEAD, hazards: true };
export const AIR: NavBand = { low: 3, high: 12, hazards: false };
const corner = new Vector3();
const q = new Quaternion();

/** A box's world-space bounds (rotated boxes: the bounds of their corners). */
function bounds(b: ArenaBox) {
  if (!b.quat) return { minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minY: b.y - b.h / 2, maxY: b.y + b.h / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 };
  q.set(...b.quat);
  const out = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < 8; i++) {
    corner.set(((i & 1) - 0.5) * b.w, (((i >> 1) & 1) - 0.5) * b.h, (((i >> 2) & 1) - 0.5) * b.d).applyQuaternion(q);
    out.minX = Math.min(out.minX, b.x + corner.x);
    out.maxX = Math.max(out.maxX, b.x + corner.x);
    out.minY = Math.min(out.minY, b.y + corner.y);
    out.maxY = Math.max(out.maxY, b.y + corner.y);
    out.minZ = Math.min(out.minZ, b.z + corner.z);
    out.maxZ = Math.max(out.maxZ, b.z + corner.z);
  }
  return out;
}

/** How far (x, z) is from a footprint (0 inside it). */
function distanceTo(f: Footprint, x: number, z: number): number {
  const dx = Math.max(f.minX - x, 0, x - f.maxX);
  const dz = Math.max(f.minZ - z, 0, z - f.maxZ);
  return Math.hypot(dx, dz);
}

/** The grid for bodies of `radius` walking (or flying, `band`) over the floor at `floorY`. */
export function buildNavGrid(arena: Arena, radius: number, floorY = 0, cell = 0.5, band: NavBand = FOOT): NavGrid {
  const floors: Footprint[] = [];
  const walls: Footprint[] = [];
  for (const b of arena.boxes) {
    const r = bounds(b);
    const f = { minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ };
    if (b.kind === 'floor' && Math.abs(r.maxY - floorY) < 0.05) floors.push(f);
    // Spikes are low, but a grunt walks round them rather than stand in them.
    else if ((band.hazards && b.kind === 'hazard') || (r.maxY > floorY + band.low && r.minY < floorY + band.high)) walls.push(f);
  }
  const grid: NavGrid = { floorY, radius, cell, minX: 0, minZ: 0, cols: 0, rows: 0, blocked: new Uint8Array(0), walls };
  if (floors.length === 0) return grid;
  grid.minX = Math.min(...floors.map((f) => f.minX));
  grid.minZ = Math.min(...floors.map((f) => f.minZ));
  grid.cols = Math.ceil((Math.max(...floors.map((f) => f.maxX)) - grid.minX) / cell);
  grid.rows = Math.ceil((Math.max(...floors.map((f) => f.maxZ)) - grid.minZ) / cell);
  // A cell is free when its middle is on a floor and further than `radius` from every wall. Update 0.0.13 — each
  // footprint marks only the cells near it (rooms twice the size made testing every cell against every box slow).
  const onFloor = new Uint8Array(grid.cols * grid.rows);
  const nearWall = new Uint8Array(grid.cols * grid.rows);
  for (const f of floors) mark(grid, f, 0, (d) => d === 0, onFloor);
  for (const f of walls) mark(grid, f, radius, (d) => d < radius, nearWall);
  grid.blocked = new Uint8Array(grid.cols * grid.rows);
  for (let i = 0; i < grid.blocked.length; i++) grid.blocked[i] = onFloor[i] && !nearWall[i] ? 0 : 1;
  return grid;
}

/** Sets `out` for every cell whose middle is within `reach` of footprint `f` and passes `hit` (its distance to it). */
function mark(g: NavGrid, f: Footprint, reach: number, hit: (d: number) => boolean, out: Uint8Array) {
  // One cell to spare each way (rounding); `hit` makes the exact call.
  const c0 = Math.max(0, Math.ceil((f.minX - reach - g.minX) / g.cell - 0.5) - 1);
  const c1 = Math.min(g.cols - 1, Math.floor((f.maxX + reach - g.minX) / g.cell - 0.5) + 1);
  const r0 = Math.max(0, Math.ceil((f.minZ - reach - g.minZ) / g.cell - 0.5) - 1);
  const r1 = Math.min(g.rows - 1, Math.floor((f.maxZ + reach - g.minZ) / g.cell - 0.5) + 1);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (hit(distanceTo(f, g.minX + (c + 0.5) * g.cell, g.minZ + (r + 0.5) * g.cell))) out[r * g.cols + c] = 1;
    }
  }
}

/** True when the grid has cells (an arena with a floor). */
export const hasCells = (g: NavGrid) => g.cols > 0;

export function colOf(g: NavGrid, x: number): number {
  return Math.floor((x - g.minX) / g.cell);
}

export function rowOf(g: NavGrid, z: number): number {
  return Math.floor((z - g.minZ) / g.cell);
}

/** Can a body stand in this cell? Off the grid is blocked. */
export function freeCell(g: NavGrid, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < g.cols && row < g.rows && g.blocked[row * g.cols + col] === 0;
}

/** Can a body stand at (x, z)? (Everywhere, with no grid.) */
export function freeAt(g: NavGrid, x: number, z: number): boolean {
  return !hasCells(g) || freeCell(g, colOf(g, x), rowOf(g, z));
}

/** Can a body walk straight from a to b? Samples the line every quarter cell. */
export function lineClear(g: NavGrid, ax: number, az: number, bx: number, bz: number): boolean {
  if (!hasCells(g)) return true;
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.ceil(len / (g.cell * 0.25)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!freeAt(g, ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

/** Does the segment a→b pass through a wall's footprint (no body width: is a wall in between)? */
export function wallBetween(g: NavGrid, ax: number, az: number, bx: number, bz: number): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  for (const f of g.walls) {
    // Slab test on the footprint, x then z.
    slabT0 = 0;
    slabT1 = 1;
    slab(ax, dx, f.minX, f.maxX);
    slab(az, dz, f.minZ, f.maxZ);
    if (slabT0 <= slabT1) return true;
  }
  return false;
}

let slabT0 = 0;
let slabT1 = 1;

/** Narrows [slabT0, slabT1] to where p + t·d lies between lo and hi. */
function slab(p: number, d: number, lo: number, hi: number) {
  if (Math.abs(d) < 1e-9) {
    if (p < lo || p > hi) slabT0 = 2;
    return;
  }
  const ta = (lo - p) / d;
  const tb = (hi - p) / d;
  slabT0 = Math.max(slabT0, Math.min(ta, tb));
  slabT1 = Math.min(slabT1, Math.max(ta, tb));
}

/** Pushes a body of `radius` at `pos` (x, z) out of every wall it overlaps. Returns true if it moved it. */
export function pushOutOfWalls(g: NavGrid, pos: Vector3, radius: number): boolean {
  let moved = false;
  // Two passes: a body pushed out of one wall into another at a corner gets the second push too.
  for (let pass = 0; pass < 2; pass++) {
    for (const f of g.walls) {
      const cx = Math.max(f.minX, Math.min(pos.x, f.maxX));
      const cz = Math.max(f.minZ, Math.min(pos.z, f.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d = Math.hypot(dx, dz);
      if (d >= radius) continue;
      moved = true;
      if (d > 1e-6) {
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
        continue;
      }
      // The centre is inside the footprint: out through the nearest side.
      const left = pos.x - f.minX;
      const right = f.maxX - pos.x;
      const back = pos.z - f.minZ;
      const front = f.maxZ - pos.z;
      const least = Math.min(left, right, back, front);
      if (least === left) pos.x = f.minX - radius;
      else if (least === right) pos.x = f.maxX + radius;
      else if (least === back) pos.z = f.minZ - radius;
      else pos.z = f.maxZ + radius;
    }
  }
  return moved;
}

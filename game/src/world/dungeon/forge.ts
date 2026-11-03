// Update 0.3.13 — floor 8's, The Forge: its machinery as the floor lays it out (forgeRooms.ts) and its workbenches'
// dressing. A press is crusher cells side by side (one hammer over all of them) standing in an iron frame, a post at
// each corner (solid); a fire vent is a grate on its cell; a belt cell runs the way the room's layout says. Each press
// and vent has a place in its room's beat (`beat`: the knobs' wave times it), so they go off one after another across
// the room. The view draws them (engine/forgeView.ts), the sim runs them (sim/dungeon/machinery.ts). Pure.
import type { Rng } from '../../core/rng';
import type { ArenaBox } from '../arena';
import type { Put } from './dressExtras';
import { CELL, cellAt, cellX, cellZ, colAt, FloorPlan, GRID, rowAt } from './floorPlan';

/** A press: its middle and its size (m: the crusher cells'), its room, its place in the beat. */
export interface PressSpot {
  x: number;
  z: number;
  w: number;
  d: number;
  room: number;
  beat: number;
}

/** A fire vent: its cell's middle, its room, its place in the beat. */
export interface VentSpot {
  x: number;
  z: number;
  room: number;
  beat: number;
}

/** A belt cell: its middle and the way it runs (dx, dz). */
export interface BeltCell {
  x: number;
  z: number;
  dx: number;
  dz: number;
}

export interface Forge {
  presses: PressSpot[];
  vents: VentSpot[];
  belts: BeltCell[];
  /** Each grid cell's belt (its index + 1; 0: none). */
  beltAt: Int16Array;
}

/** A press's frame: its posts' side (m), how far in from the press's corners they stand, and how tall the frame is. */
export const POST = 0.32;
export const POST_IN = 0.2;
export const FRAME_H = 6.2;

/** The workbench: its table (the dungeon pack's small table, stretched to the cell) and what lies on it. */
export const FORGE = {
  table: 'kit_p1_Table_Small',
  tableScale: [1.5, 1, 1] as [number, number, number],
  top: 0.85,
  onTop: ['kit_r_Mineral', 'kit_r_Mineral', 'kit_r_Gold_Ingots'],
};

export const noForge = (): Forge => ({ presses: [], vents: [], belts: [], beltAt: new Int16Array(GRID * GRID) });

/** The machinery of floor `plan` (none on a floor without it); each press's four posts go into `boxes`. */
export function forgeOf(plan: FloorPlan, boxes: ArenaBox[]): Forge {
  const forge = noForge();
  for (const r of plan.rooms) {
    const { w, h, cells } = r.layout;
    const seen = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const c = cells[row * w + col];
        const beat = col + row;
        if (c === 'vent') forge.vents.push({ x: cellX(r.x0 + col), z: cellZ(r.z0 + row), room: r.index, beat });
        if (c !== 'crusher' || seen[row * w + col]) continue;
        // A press: as far right and down as the crusher cells go (they're drawn as rectangles).
        let pw = 0;
        while (col + pw < w && cells[row * w + col + pw] === 'crusher') pw++;
        let ph = 0;
        while (row + ph < h && cells[(row + ph) * w + col] === 'crusher') ph++;
        for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) seen[(row + j) * w + col + i] = 1;
        const p: PressSpot = { x: cellX(r.x0 + col) + ((pw - 1) * CELL) / 2, z: cellZ(r.z0 + row) + ((ph - 1) * CELL) / 2, w: pw * CELL, d: ph * CELL, room: r.index, beat };
        forge.presses.push(p);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push({ x: p.x + sx * (p.w / 2 - POST_IN), y: FRAME_H / 2, z: p.z + sz * (p.d / 2 - POST_IN), w: POST, h: FRAME_H, d: POST, kind: 'block' });
      }
    }
    for (const [col, row, dx, dz] of r.layout.belts) {
      forge.belts.push({ x: cellX(r.x0 + col), z: cellZ(r.z0 + row), dx, dz });
      forge.beltAt[(r.z0 + row) * GRID + r.x0 + col] = forge.belts.length;
    }
  }
  return forge;
}

/** The belt under (x, z) (null: none). */
export function beltUnder(forge: Forge, x: number, z: number): BeltCell | null {
  const col = colAt(x);
  const row = rowAt(z);
  if (col < 0 || row < 0 || col >= GRID || row >= GRID) return null;
  const i = forge.beltAt[row * GRID + col];
  return i > 0 ? forge.belts[i - 1] : null;
}

/** A workbench: the table across its cell, ingots or ore on it now and then. (The rest of the Forge's cells are
 *  paving under what the view draws.) */
export function dressBench(x: number, z: number, rng: Rng, put: Put) {
  const turn = Math.floor(rng() * 2) * Math.PI;
  put(FORGE.table, x, 0, z, turn, ...FORGE.tableScale);
  if (rng() < 0.55) {
    const s = 0.8 + 0.4 * rng();
    put(FORGE.onTop[Math.floor(rng() * FORGE.onTop.length)], x + (rng() - 0.5) * 0.8, FORGE.top, z + (rng() - 0.5) * 1.1, rng() * Math.PI * 2, s, s, s);
  }
}

/** The plan's cell under (x, z), for the tests. */
export const cellUnder = (plan: FloorPlan, x: number, z: number) => cellAt(plan, colAt(x), rowAt(z));

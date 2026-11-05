// Update 0.3.52 — The Swarm's room (the designer: "each boss their designed room"; the Boss Design Bible: "a round flesh
// cavern, soft floor the worms tunnel through"). Round: a boss room's size with its corners walled up in steps, a wall of
// flesh standing in front of the steps (engine/swarm/swarmShowView.ts draws it, its floor and its pillars' sheaths), and a ring
// of solid boxes just behind it, so you walk the curve and can't get behind it. A gap in the ring at each doorway. Its pillars
// are what its lasers and its glare can't get through. Pure.
import type { ArenaBox } from '../arena';
import { cellsBox } from './cellBoxes';
import { quarter } from './fightRooms';
import type { FloorPlan, Side } from './floorPlan';
import type { RoomTemplate } from './rooms';

/** A cell's middle further than this from the room's middle is wall (cells: its inner corner is then outside the flesh). */
const ROUND = 15.3;
/** The wall of flesh's radius, and the ring of boxes' (m); its boxes' side; how high they stand. */
export const NEST_RADIUS = 27.9;
const RING = 28.3;
const BOX = 1;
const TALL = 12;
/** A doorway's gap in the wall of flesh: this far either side of its line (m). */
export const NEST_GAP = 3.2;

/** A quarter of it, from the far corner: walled up to a circle, its pillars, pads and spawn spots laid over it. */
function rows(): string[] {
  const out: string[][] = [];
  for (let r = 0; r < 15; r++) {
    const row: string[] = [];
    for (let c = 0; c < 15; c++) row.push(Math.hypot(14.5 - c, 14.5 - r) > ROUND ? '#' : '.');
    out.push(row);
  }
  const put = (c: number, r: number, ch: string) => (out[r][c] = ch);
  // Its pillars: four near, eight further out.
  put(8, 8, 'C');
  put(11, 4, 'C');
  put(4, 11, 'C');
  // Pads to get over its low lasers from.
  put(6, 6, 'J');
  // Where anything comes from (nothing does, but a room has spots).
  put(12, 7, 'E');
  put(7, 12, 'E');
  return out.map((r) => r.join(''));
}

export const NEST_ROOM: RoomTemplate = { id: 'the nest', kind: 'boss', rows: quarter(rows()) };

/** The directions of its doorways, from its middle (x, z). */
export function nestDoors(plan: FloorPlan): { x: number; z: number }[] {
  const r = plan.rooms.find((q) => q.kind === 'boss');
  if (!r) return [];
  const way = (s: Side) => ({ x: s === 'w' ? -1 : s === 'e' ? 1 : 0, z: s === 'n' ? -1 : s === 's' ? 1 : 0 });
  const sides: Side[] = [...r.doors];
  if (plan.wayOut && !sides.includes(plan.wayOut.side)) sides.push(plan.wayOut.side);
  return sides.map(way);
}

/** Is the way (dx, dz) from its middle (unit) in a doorway's gap, at `radius` m out? */
export function inNestGap(doors: readonly { x: number; z: number }[], dx: number, dz: number, radius: number, gap = NEST_GAP): boolean {
  for (const d of doors) {
    const along = dx * d.x + dz * d.z;
    const across = Math.abs(dx * d.z - dz * d.x) * radius;
    if (along > 0 && across <= gap) return true;
  }
  return false;
}

/** The ring behind its wall of flesh, and two short walls either side of each doorway's gap, out to the room's wall. */
export function nestBoxes(plan: FloorPlan, boxes: ArenaBox[]) {
  const r = plan.rooms.find((q) => q.kind === 'boss');
  if (!r) return;
  // (The room's middle, as a box round all of it has it.)
  const cx = cellsBox(r.x0, r.z0, r.layout.w, r.layout.h, 0, 1, 'block');
  const doors = nestDoors(plan);
  const add = (x: number, z: number) => boxes.push({ x, y: TALL / 2, z, w: BOX, h: TALL, d: BOX, kind: 'block' });
  const n = Math.ceil((Math.PI * 2 * RING) / (BOX * 0.9));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    if (inNestGap(doors, dx, dz, RING)) continue;
    add(cx.x + dx * RING, cx.z + dz * RING);
  }
  // Either side of each gap, out past the steps to the wall.
  for (const d of doors) {
    for (const side of [-1, 1]) {
      for (let out = RING - BOX; out < RING + 4.5; out += BOX * 0.9) add(cx.x + d.x * out + d.z * side * (NEST_GAP + BOX / 2), cx.z + d.z * out + d.x * side * (NEST_GAP + BOX / 2));
    }
  }
}

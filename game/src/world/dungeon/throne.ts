// Update 0.3.63 — Hellwarden's room (the designer: "each boss their designed room"; the Boss Design Bible: "a burning throne room floating in
// a void"; MD/FLOOR10_HELL_PLAN.md: "the Throne of Cinders ... ringed by pillars and chains, lava in channels across it"). A boss room's size,
// its middle clear. Columns its Arc cuts through, and all of them come down as its throne room breaks; pools of lava to route round; a dais
// in each corner. Pure.
// Update 0.3.65 — its bones are its show's (engine/hell/throneBones.ts).
import { quarter } from './fightRooms';
import { cellAt, cellX, cellZ, type FloorPlan } from './floorPlan';
import type { RoomTemplate } from './rooms';

export const THRONE_ROOM: RoomTemplate = {
  id: 'the throne of cinders',
  kind: 'boss',
  rows: quarter([
    '...............',
    '.pp............',
    '.pp...C....C...',
    '...............',
    '..LLL..........',
    '..LLL...C......',
    '.C.............',
    '..............E',
    '......C........',
    '...........C...',
    '..E............',
    '.C....LLL......',
    '......LLL......',
    '...............',
    '...............',
  ]),
};

const BONES = ['kit_p2_Bones', 'kit_p2_Bones2', 'kit_r_Bone', 'kit_r_Skull'];
/** The odds of bones on a cell of floor, away from its middle. */
const ON_FLOOR = 0.08;
/** Update 0.3.65 — however many falls you've had, no more than this many more bones. */
const MOST_EXTRA = 140;
/** The heap on its bank: this far toward you from its middle, this far to the right as you look at it (m): wardenForge.ts's PILE. */
const HEAP: readonly [number, number] = [3.4, 5];

/** Update 0.3.65 — a bone on its floor, and its way into the river in Hellwarden's show. */
export interface ThroneBone {
  piece: string;
  x: number;
  z: number;
  yaw: number;
  size: number;
  /** Where it goes in; how far along that way the river's edge is (0..1). */
  toX: number;
  toZ: number;
  edge: number;
  /** Seconds after they start that it goes, how long it takes (s, for 3 s of bones). */
  delay: number;
  dur: number;
  seed: number;
  /** In the heap on its bank: stays. */
  keep: boolean;
}

/** Update 0.3.65 — the bones' own show (engine/hell/throneBones.ts): the room's floor's scattering of them, seeded by the floor; `extra` more for the
 *  times you've fallen; each dragged to the river across its middle, along (ux, uz), `riverHalf` wide and `riverLong` long either way. Pure. */
export function throneBones(plan: FloorPlan, mx: number, mz: number, ux: number, uz: number, riverHalf: number, riverLong: number, extra = 0): ThroneBone[] {
  const r = plan.rooms.find((x) => x.kind === 'boss');
  if (!r) return [];
  const { w, h } = r.layout;
  let seed = 2281 + plan.level * 17;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const out: ThroneBone[] = [];
  const lay = (piece: string, x: number, z: number, size: number, delay: number, dur: number) => {
    const along = (x - mx) * ux + (z - mz) * uz;
    const side = (x - mx) * uz - (z - mz) * ux;
    const on = Math.max(-riverLong * 0.92, Math.min(riverLong * 0.92, along));
    // Just over its edge, from the side it's on.
    const inTo = Math.sign(side || 1) * riverHalf * 0.5;
    const toX = mx + ux * on + uz * inTo;
    const toZ = mz + uz * on - ux * inTo;
    const whole = Math.max(0.1, Math.hypot(toX - x, toZ - z));
    const edge = Math.max(0, Math.min(0.98, 1 - (riverHalf * 0.5) / whole));
    out.push({ piece, x, z, yaw: rng() * Math.PI * 2, size, toX, toZ, edge, delay, dur, seed: rng(), keep: false });
  };
  const more = Math.min(MOST_EXTRA, Math.max(0, Math.floor(extra)));
  let left = more;
  for (let pass = 0; pass < 6 && (pass === 0 || left > 0); pass++) {
    for (let row = r.z0; row < r.z0 + h; row++) {
      for (let col = r.x0; col < r.x0 + w; col++) {
        if (cellAt(plan, col, row) !== 'floor') continue;
        const x = cellX(col);
        const z = cellZ(row);
        const odds = pass === 0 ? ON_FLOOR : ON_FLOOR * 1.4;
        if (Math.hypot(x - mx, z - mz) < 12 || rng() >= odds) continue;
        if (pass > 0 && left-- <= 0) continue;
        const s = 0.6 + rng() * 0.5;
        lay(BONES[Math.floor(rng() * BONES.length)], x + (rng() - 0.5) * 1.4, z + (rng() - 0.5) * 1.4, s, 0.25 + rng() * 1.3, 0.85 + rng() * 0.6);
      }
    }
  }
  // A few across the low shot's way, late, right past the view (wardenCinema.ts's LOW_AT).
  for (let i = 0; i < 8; i++) {
    const f = 3 + i * 1.5;
    const s = 9 + (i % 3) * 2;
    lay(BONES[i % BONES.length], mx + ux * f + uz * s, mz + uz * f - ux * s, 0.8 + (i % 2) * 0.25, 1.45 + i * 0.08, 0.95);
  }
  // The heap on its bank.
  const hx = mx + ux * HEAP[0] + uz * HEAP[1];
  const hz = mz + uz * HEAP[0] - ux * HEAP[1];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const d = 0.35 + (i % 3) * 0.6;
    lay(i % 2 ? 'kit_r_Skull' : BONES[i % 2 ? 3 : (i / 2) % 2 ? 0 : 1], hx + Math.cos(a) * d, hz + Math.sin(a) * d, 0.62 + (i % 3) * 0.14, 0, 1);
    out[out.length - 1].keep = true;
  }
  return out;
}

// Update 0.1.20 — a word over every doorway into a room, on the corridor's side (the designer: "a text just above the
// room entrance saying either Room, Challenge, Shop, Boss"), so you know what's through it before you go in. The start
// room has none (you begin in it). Pure: where each stands and what it says (engine/roomSignsView.ts draws them).
import { CELL, cellX, cellZ, FloorPlan, PlacedRoom, Side } from './floorPlan';

export type SignWord = 'Room' | 'Challenge' | 'Shop' | 'Boss';

export interface Sign {
  word: SignWord;
  /** Its middle (world m), on the wall's face over the arch. */
  x: number;
  y: number;
  z: number;
  /** Its turn about y: it faces out of the room, into the corridor. */
  rot: number;
}

/** How high its middle is (m): over the arch (3.7 m) on the wall's top tile (4–6 m). */
export const SIGN_Y = 4.85;
/** How far out from the wall's face (m): clear of the bricks' relief. */
const OUT = 0.14;

/** Out of a room through its door on each side: the way, and the turn that faces it. */
const OUTWARD: Record<Side, [number, number, number]> = { n: [0, -1, Math.PI], s: [0, 1, 0], w: [-1, 0, -Math.PI / 2], e: [1, 0, Math.PI / 2] };

export function wordOf(r: PlacedRoom): SignWord | null {
  switch (r.kind) {
    case 'fight':
      return r.challenge ? 'Challenge' : 'Room';
    case 'shop':
      return 'Shop';
    case 'boss':
      return 'Boss';
    case 'start':
      return null;
  }
}

/** Every sign on a floor: one over each doorway of each room but the start. */
export function signsOf(plan: FloorPlan): Sign[] {
  const out: Sign[] = [];
  for (const r of plan.rooms) {
    const word = wordOf(r);
    if (!word) continue;
    const { w, h } = r.layout;
    for (const side of r.doors) {
      const [ox, oz, rot] = OUTWARD[side];
      // The doorway's middle (between its two cells) in the wall's middle, then out to the wall's outer face.
      const x = side === 'n' || side === 's' ? cellX(r.x0 + w / 2) - CELL / 2 : cellX(side === 'w' ? r.x0 - 1 : r.x0 + w);
      const z = side === 'w' || side === 'e' ? cellZ(r.z0 + h / 2) - CELL / 2 : cellZ(side === 'n' ? r.z0 - 1 : r.z0 + h);
      out.push({ word, x: x + ox * (CELL / 2 + OUT), y: SIGN_Y, z: z + oz * (CELL / 2 + OUT), rot });
    }
  }
  return out;
}

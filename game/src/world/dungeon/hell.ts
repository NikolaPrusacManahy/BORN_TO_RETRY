// Update 0.3.43 — floor 10's own dressing, Hell's (MD/FLOOR10_HELL_PLAN.md: "chains hanging from the walls … braziers"):
// chains hung on the rooms' walls, some in a swag between two hooks across two cells of wall, some hanging straight
// down from the wall's top; and an iron brazier in each corner of a room, burning (the kit's wood fire in its bowl),
// solid. Never near a door, a chest, a wall torch or a skull on the wall; none in the boss room (its walls slide).
// The view draws the chains and the braziers' iron (engine/hell/hellView.ts); the fires are the kit's (dressHell).
// Pure and seeded by the floor's cells.
import type { ArenaBox } from '../arena';
import type { Put } from './dressExtras';
import { CELL, cellAt, cellX, cellZ, FloorPlan } from './floorPlan';
import type { PlacedRoom } from './floorPlan';
import { styleOf } from './styles';
import type { Cell } from './rooms';

/** A cell you stand on (cores.ts's, which can't be imported here: it needs assemble.ts, which needs this). */
const surface = (c: Cell) => c !== 'void' && c !== 'wall' && c !== 'dark';

/** A chain: hung from (ax, ay, az) to (bx, by, bz), sagging `sag` m in the middle (0: straight down from a to b);
 *  (nx, nz) the way out of the wall it hangs on. */
export interface Chain {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  sag: number;
  nx: number;
  nz: number;
  room: number;
}

/** A brazier: where it stands, its room. */
export interface Brazier {
  x: number;
  z: number;
  room: number;
}

export interface Hell {
  chains: Chain[];
  braziers: Brazier[];
}

export const noHell = (): Hell => ({ chains: [], braziers: [] });

/** A brazier: its block's side and height (m), its bowl's top, the fire in it (the kit's, its size), how far into its
 *  corner it stands from its cell's middle (m). */
export const BRAZIER = { side: 1.35, h: 1.55, bowl: 1.45, fireY: 1.15, fire: 'kit_p1_Woodfire', fireScale: 1.2, inset: 0.3 };
/** The chains: a swag's hooks' height and sag (m), how far off the wall they hang, a straight one's top and how low
 *  it comes (m, give or take half a metre), at most this many on a wall of a room. */
export const CHAIN = { hookY: 4.4, sag: 1.3, out: 0.12, top: 5.85, low: 3.2, perSide: 3 };

/** A wall cell keeps its torch, or its skull, where dressing.ts puts them: no chain on it. */
const torchy = (col: number, row: number) => (col * 3 + row * 5) % 7 === 0 || (col * 7 + row * 3) % 23 === 0;

/** Each side of a room: the wall cell and the room's cell beside it, `i` along it; the way into the room. */
const SIDES = [
  { wall: (r: PlacedRoom, i: number) => [r.x0 + i, r.z0 - 1], in: (r: PlacedRoom, i: number) => [r.x0 + i, r.z0], n: [0, 1], len: (r: PlacedRoom) => r.layout.w },
  { wall: (r: PlacedRoom, i: number) => [r.x0 + i, r.z0 + r.layout.h], in: (r: PlacedRoom, i: number) => [r.x0 + i, r.z0 + r.layout.h - 1], n: [0, -1], len: (r: PlacedRoom) => r.layout.w },
  { wall: (r: PlacedRoom, i: number) => [r.x0 - 1, r.z0 + i], in: (r: PlacedRoom, i: number) => [r.x0, r.z0 + i], n: [1, 0], len: (r: PlacedRoom) => r.layout.h },
  { wall: (r: PlacedRoom, i: number) => [r.x0 + r.layout.w, r.z0 + i], in: (r: PlacedRoom, i: number) => [r.x0 + r.layout.w - 1, r.z0 + i], n: [-1, 0], len: (r: PlacedRoom) => r.layout.h },
] as const;

/** Is (col, row) within `reach` cells of a door? */
function nearDoor(plan: FloorPlan, col: number, row: number, reach = 2) {
  for (let dr = -reach; dr <= reach; dr++) for (let dc = -reach; dc <= reach; dc++) if (cellAt(plan, col + dc, row + dr) === 'door') return true;
  return false;
}

/** Hell's chains and braziers on floor `plan` (none on another floor); each brazier's block goes into `boxes`. */
export function hellOf(plan: FloorPlan, boxes?: ArenaBox[]): Hell {
  const hell = noHell();
  if (styleOf(plan.level).id !== 'hell') return hell;
  for (const r of plan.rooms) {
    if (r.kind === 'boss') continue;
    // Chains on its walls.
    SIDES.forEach((side, s) => {
      const ok = (i: number) => {
        // (Not in a corner: what hangs on the wall round it would crowd it.)
        if (i < 1 || i >= side.len(r) - 1) return false;
        const [wc, wr] = side.wall(r, i);
        const [ic, ir] = side.in(r, i);
        const c = cellAt(plan, ic, ir);
        return cellAt(plan, wc, wr) === 'wall' && surface(c) && c !== 'door' && !torchy(wc, wr) && !nearDoor(plan, ic, ir);
      };
      const [nx, nz] = side.n;
      let placed = 0;
      for (let i = 0; i < side.len(r) && placed < CHAIN.perSide; i++) {
        const [wc, wr] = side.wall(r, i);
        const pick = (wc * 5 + wr * 11 + s * 3 + plan.seed) % 9;
        // The wall's face: the edge of its cell towards the room, the chain a little off it.
        const fx = cellX(wc) + nx * (CELL / 2 + CHAIN.out);
        const fz = cellZ(wr) + nz * (CELL / 2 + CHAIN.out);
        // (Along the wall: across the way into the room.)
        const ax = Math.abs(nz);
        const az = Math.abs(nx);
        if (pick === 0 && ok(i) && ok(i + 1)) {
          const half = CELL - 0.25;
          const mx = fx + ax * (CELL / 2);
          const mz = fz + az * (CELL / 2);
          hell.chains.push({ ax: mx - ax * half, ay: CHAIN.hookY, az: mz - az * half, bx: mx + ax * half, by: CHAIN.hookY, bz: mz + az * half, sag: CHAIN.sag * (0.8 + 0.4 * (((wc + wr) % 5) / 4)), nx, nz, room: r.index });
          placed++;
          i += 2;
        } else if (pick === 4 && ok(i)) {
          const low = CHAIN.low + (((wc * 3 + wr) % 5) / 4 - 0.5);
          hell.chains.push({ ax: fx, ay: CHAIN.top, az: fz, bx: fx, by: low, bz: fz, sag: 0, nx, nz, room: r.index });
          placed++;
          i++;
        }
      }
    });
    // A brazier in each corner (not by a door or the chest).
    const { w, h } = r.layout;
    for (const [col, row, sx, sz] of [
      [0, 0, -1, -1],
      [w - 1, 0, 1, -1],
      [0, h - 1, -1, 1],
      [w - 1, h - 1, 1, 1],
    ]) {
      const gc = r.x0 + col;
      const gr = r.z0 + row;
      if (cellAt(plan, gc, gr) !== 'floor' || nearDoor(plan, gc, gr)) continue;
      if (r.chest && Math.abs(r.chest[0] - col) <= 2 && Math.abs(r.chest[1] - row) <= 2) continue;
      const b = { x: cellX(gc) + sx * BRAZIER.inset, z: cellZ(gr) + sz * BRAZIER.inset, room: r.index };
      hell.braziers.push(b);
      boxes?.push({ x: b.x, y: BRAZIER.h / 2, z: b.z, w: BRAZIER.side, h: BRAZIER.h, d: BRAZIER.side, kind: 'block' });
    }
  }
  return hell;
}

/** Hell's fires: the kit's wood fire in each brazier's bowl. */
export function dressHell(plan: FloorPlan, put: Put) {
  for (const b of hellOf(plan).braziers) put(BRAZIER.fire, b.x, BRAZIER.fireY, b.z, (b.x * 7 + b.z * 3) % 6, BRAZIER.fireScale, BRAZIER.fireScale, BRAZIER.fireScale);
}

// Update 0.0.12 — what the dungeon looks like: where each Modular Dungeon Pack piece goes (export_dungeon_kit.py), worked
// out from the floor plan and its seed. The collision is the boxes (assemble.ts); this only dresses them: floor tiles,
// brick walls three high with a cap on every face that looks into a room or corridor, arches over the doorways (the
// iron bars in them are the gates), columns, crates, broken columns, spike traps, stone ledges, the trapdoor that is
// the way down, wall torches, a few banners, and bones, skulls and rocks along the walls. Pure and seeded.
// Update 0.0.13 — the shop: a red carpet before its tiles and a tall candelabrum at each end of them (the tiles, their
// items and the chests are drawn by engine/treasureView.ts).
// Update 0.0.13 — solid cores inside the walls and ledges (the designer saw the sky through them in daylight): the kit's
// brick faces have jagged edges, so where two meet at a corner, or a wall meets the floor, notches opened onto the empty
// cell behind. A plain dark block now fills each wall and ledge cell, set just behind its faces (only on the sides that
// have faces: next to another wall it reaches the cell's edge, so no crack runs through), so a notch shows shadow.
import { createRng } from '../../core/rng';
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID, Side } from './floorPlan';
import { HEIGHT } from './assemble';
import type { ArenaBox } from '../arena';
import type { Cell } from './rooms';

export interface Placement {
  piece: string;
  x: number;
  y: number;
  z: number;
  /** Turn about y (rad), and scale per axis. */
  rot: number;
  sx: number;
  sy: number;
  sz: number;
}

export interface GateLook {
  /** Where the bars stand when shut, which way the doorway runs, and its room. */
  x: number;
  z: number;
  rot: number;
  room: number;
}

export interface Dressing {
  pieces: Placement[];
  gates: GateLook[];
  /** Where torch flames burn (for the lights). */
  torches: { x: number; y: number; z: number }[];
  /** Update 0.0.13 — the solid cores of the wall and ledge cells (boxes, behind their faces). */
  cores: ArenaBox[];
}

/** Kit pieces (export_dungeon_kit.py names). */
export const KIT = {
  floor: 'kit_p1_Floor_Modular',
  wall: 'kit_p1_Wall_Modular',
  cap: 'kit_p1_WallCover_Modular',
  arch: 'kit_p1_Arch',
  bars: 'kit_p1_Arch_bars',
  column: 'kit_p2_Column',
  crate: 'kit_p1_Crate',
  broken: 'kit_p2_Column_Broken2',
  spikes: 'kit_p1_Trap_spikes',
  trapdoor: 'kit_p1_Trapdoor_open',
  torch: 'kit_p2_Torch_wall',
  banner: 'kit_p1_Banner_wall',
  carpet: 'kit_p2_Carpet',
  candelabrum: 'kit_p2_Candelabrum_tall',
} as const;
const LITTER = ['kit_p1_Skull', 'kit_p2_Bones', 'kit_p2_Bones2', 'kit_p2_Rock1', 'kit_p2_Rock2', 'kit_p2_Rock3', 'kit_p1_Vase', 'kit_p1_Bucket'];

/** The arch is stretched so its opening is the 4 m doorway (it's 2.3 m wide, 3.1 m tall as it comes). */
export const ARCH_SCALE: [number, number, number] = [1.75, 1.2, 1];
export const BARS_SCALE: [number, number, number] = [1.69, 1.12, 1];
const WALL_PIECE = 2;
const WALL_DEPTH = 0.44;
/** A core sits this far behind its faces' fronts (inside their depth), from below the floor to just under the top: the
 *  wall's caps, or a ledge's top tiles (0.25 thick). */
export const CORE_INSET = 0.2;
export const CORE_BOTTOM = -0.5;
const CORE_TOP_GAP: Partial<Record<Cell, number>> = { wall: 0.02, ledge: 0.3, highLedge: 0.3 };
const TORCH_REACH = 0.55;
const TORCH_Y = 2.2;

/** A turn that points a piece's front (+z) along a direction. */
const FACING: Record<Side, number> = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const DIRS: [number, number, Side][] = [
  [0, 1, 's'],
  [0, -1, 'n'],
  [1, 0, 'e'],
  [-1, 0, 'w'],
];

const surface = (c: Cell) => c !== 'void' && c !== 'wall';
const height = (c: Cell) => HEIGHT[c] ?? 0;

export function dress(plan: FloorPlan): Dressing {
  const rng = createRng(plan.seed * 31 + plan.level);
  const pieces: Placement[] = [];
  const torches: Dressing['torches'] = [];
  const put = (piece: string, x: number, y: number, z: number, rot = 0, sx = 1, sy = 1, sz = 1) => pieces.push({ piece, x, y, z, rot, sx, sy, sz });
  const inRoom = new Int16Array(GRID * GRID).fill(-1);
  for (const r of plan.rooms) for (let row = -1; row <= r.layout.h; row++) for (let col = -1; col <= r.layout.w; col++) inRoom[(r.z0 + row) * GRID + r.x0 + col] = r.index;
  const nearDoor = (col: number, row: number) => {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (cellAt(plan, col + dc, row + dr) === 'door') return true;
    return false;
  };

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const c = cellAt(plan, col, row);
      const x = cellX(col);
      const z = cellZ(row);
      if (surface(c)) put(KIT.floor, x, -0.25, z);
      switch (c) {
        case 'wall':
          for (const [dc, dr, side] of DIRS) {
            const n = cellAt(plan, col + dc, row + dr);
            if (!surface(n) || n === 'door') continue;
            // The face between this wall and the floor beside it: three bricks high, capped.
            const fx = x + dc * (CELL / 2 - WALL_DEPTH / 2);
            const fz = z + dr * (CELL / 2 - WALL_DEPTH / 2);
            for (let k = 0; k < 3; k++) put(KIT.wall, fx, k * WALL_PIECE, fz, FACING[side]);
            put(KIT.cap, fx, 3 * WALL_PIECE, fz, FACING[side]);
            const room = inRoom[(row + dr) * GRID + col + dc];
            if (room >= 0 && (col * 3 + row * 5) % 7 === 0 && !nearDoor(col + dc, row + dr)) {
              const tx = x + dc * (CELL / 2 + TORCH_REACH);
              const tz = z + dr * (CELL / 2 + TORCH_REACH);
              put(KIT.torch, tx, TORCH_Y, tz, FACING[side] - Math.PI / 2);
              torches.push({ x: x + dc * (CELL / 2 + 0.95), y: TORCH_Y + 1.2, z: z + dr * (CELL / 2 + 0.95) });
            } else if (room >= 0 && (col * 7 + row * 3) % 23 === 0) {
              put(KIT.banner, x + dc * (CELL / 2 + 0.3), 3, z + dr * (CELL / 2 + 0.3), FACING[side]);
            }
          }
          break;
        case 'column':
          put(KIT.column, x, 0, z);
          break;
        case 'low':
          put(KIT.crate, x, 0, z, Math.floor(rng() * 4) * (Math.PI / 2), 1.38, 1, 1.38);
          break;
        case 'high':
          put(KIT.broken, x, 0, z, Math.floor(rng() * 4) * (Math.PI / 2));
          break;
        case 'spikes':
          put(KIT.spikes, x, 0, z, 0, 1, 0.35, 1);
          break;
        case 'ledge':
        case 'highLedge': {
          const h = height(c);
          put(KIT.floor, x, h - 0.25, z);
          for (const [dc, dr, side] of DIRS) {
            if (height(cellAt(plan, col + dc, row + dr)) >= h) continue;
            put(KIT.wall, x + dc * (CELL / 2 - WALL_DEPTH / 2), 0, z + dr * (CELL / 2 - WALL_DEPTH / 2), FACING[side], 1, h / WALL_PIECE, 1);
          }
          break;
        }
        case 'floor':
          if (inRoom[row * GRID + col] >= 0 && !nearDoor(col, row) && rng() < 0.08) {
            // Litter against a wall.
            for (const [dc, dr] of DIRS) {
              if (cellAt(plan, col + dc, row + dr) !== 'wall') continue;
              put(LITTER[Math.floor(rng() * LITTER.length)], x + dc * 0.45, 0, z + dr * 0.45, rng() * Math.PI * 2);
              break;
            }
          }
          break;
        default:
          break;
      }
    }
  }

  // Doorways: an arch, the wall above it, and the bars (the gate).
  const gates: GateLook[] = [];
  for (const r of plan.rooms) {
    for (const side of r.doors) {
      const ns = side === 'n' || side === 's';
      const col = ns ? r.x0 + r.layout.w / 2 : side === 'w' ? r.x0 - 1 : r.x0 + r.layout.w;
      const row = ns ? (side === 'n' ? r.z0 - 1 : r.z0 + r.layout.h) : r.z0 + r.layout.h / 2;
      const x = ns ? cellX(col) - CELL / 2 : cellX(col);
      const z = ns ? cellZ(row) : cellZ(row) - CELL / 2;
      const rot = ns ? 0 : Math.PI / 2;
      put(KIT.arch, x, 0, z, rot, ...ARCH_SCALE);
      gates.push({ x, z, rot, room: r.index });
      for (const k of [-1, 1]) {
        const ax = ns ? x + (k * CELL) / 2 : x;
        const az = ns ? z : z + (k * CELL) / 2;
        for (const face of [-1, 1]) {
          const fx = ns ? ax : ax + face * (CELL / 2 - WALL_DEPTH / 2);
          const fz = ns ? az + face * (CELL / 2 - WALL_DEPTH / 2) : az;
          const facing = ns ? (face > 0 ? FACING.s : FACING.n) : face > 0 ? FACING.e : FACING.w;
          put(KIT.wall, fx, 2 * WALL_PIECE, fz, facing);
          put(KIT.cap, fx, 3 * WALL_PIECE, fz, facing);
        }
      }
    }
  }
  // The shop: a carpet in front of the row of tiles, a candelabrum at each end.
  for (const r of plan.rooms) {
    const tiles = r.layout.tiles;
    if (r.kind !== 'shop' || tiles.length === 0) continue;
    const row = tiles[0][1];
    const along = tiles.every((t) => t[1] === row);
    const xs = tiles.map((t) => cellX(r.x0 + t[0]));
    const zs = tiles.map((t) => cellZ(r.z0 + t[1]));
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    // Towards the room's middle from the tiles.
    const inward = cellZ(r.z0 + r.layout.h / 2) - CELL / 2 > midZ ? 1 : -1;
    if (along) {
      put(KIT.carpet, midX, 0.01, midZ + inward * 3.4, Math.PI / 2, 1.4, 1, 1.4);
      put(KIT.candelabrum, Math.min(...xs) - CELL, 0, midZ);
      put(KIT.candelabrum, Math.max(...xs) + CELL, 0, midZ);
    }
  }
  // The way down.
  put(KIT.trapdoor, plan.exit.x, 0.01, plan.exit.z);
  return { pieces, gates, torches, cores: coresOf(plan) };
}

/** A core for every wall and ledge cell, pulled back from each side that has faces (one that looks onto lower ground). */
function coresOf(plan: FloorPlan): ArenaBox[] {
  const cores: ArenaBox[] = [];
  const top = (c: Cell) => (c === 'wall' ? HEIGHT.wall! : c === 'ledge' || c === 'highLedge' ? height(c) : 0);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const c = cellAt(plan, col, row);
      const h = top(c);
      if (h === 0) continue;
      // A side has faces when the cell beside it is lower ground (as the faces are placed above: not the void outside,
      // not a doorway, whose arch covers it).
      const faced = (dc: number, dr: number) => {
        const n = cellAt(plan, col + dc, row + dr);
        return surface(n) && n !== 'door' && top(n) < h;
      };
      const w0 = faced(-1, 0) ? CORE_INSET : 0;
      const w1 = faced(1, 0) ? CORE_INSET : 0;
      const d0 = faced(0, -1) ? CORE_INSET : 0;
      const d1 = faced(0, 1) ? CORE_INSET : 0;
      const y1 = h - CORE_TOP_GAP[c]!;
      cores.push({ x: cellX(col) + (w0 - w1) / 2, y: (CORE_BOTTOM + y1) / 2, z: cellZ(row) + (d0 - d1) / 2, w: CELL - w0 - w1, h: y1 - CORE_BOTTOM, d: CELL - d0 - d1, kind: 'wall' });
    }
  }
  return cores;
}

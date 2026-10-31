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
// Update 0.0.15 — no trapdoor: the way down is the boss room's wooden gate (drawn by engine/bossRoomView.ts, with the
// dark beyond it); here, the wall over its doorway and a torch either side. The dark gets no tiles and no wall faces.
// Update 0.0.20 — lava pits: no floor tile over the lava (engine/lavaView.ts draws it), brick faces down a pit's sides,
// walls standing in lava faced down to it, and a warm light over a pit every few cells (the torch lights).
// Update 0.0.20 — each floor its look (styles.ts): floors 1–2 brick, floor 3 stone. The pieces a look changes come from
// it (floor, walls, the doorway and its gate, columns, wall dressing, litter); the rest stay the same.
// Update 0.2.4 — the shop's dressing and floor 4's sand cells (palms and cacti in their beds, quicksand) are
// dressExtras.ts's; sand cells get no paving.
// Update 0.2.9 — the walls' and ledges' cores moved to cores.ts, with feet under them and behind a pit's faces: the sky no
// longer shows along their feet.
import { createRng } from '../../core/rng';
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID, Side } from './floorPlan';
import { HEIGHT, LAVA_DEPTH } from './assemble';
import type { ArenaBox } from '../arena';
import type { Cell } from './rooms';
import { DungeonStyle, styleOf } from './styles';
import { dressSand, dressShop, SANDY, SandCell } from './dressExtras';
import { coresOf, surface } from './cores';

export { CORE_BOTTOM, CORE_INSET } from './cores';

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
  /** Update 0.0.20 — the lava cells' middles, and the floor's look. */
  lava: { x: number; z: number }[];
  style: DungeonStyle;
  /** Update 0.2.4 — loose sand: quicksand and the beds palms and cacti stand in. */
  sand: SandCell[];
  /** Update 0.2.10 — lily pads on the tide (they ride its level: waterView.ts). */
  floats: Placement[];
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
  torch: 'kit_p2_Torch_wall',
  banner: 'kit_p1_Banner_wall',
} as const;

/** The arch is stretched so its opening is the 4 m doorway (it's 2.3 m wide, 3.1 m tall as it comes). */
export const ARCH_SCALE: [number, number, number] = [1.75, 1.2, 1];
export const BARS_SCALE: [number, number, number] = [1.69, 1.12, 1];
/** Update 0.0.20 — a column stack's middle pieces are this much shorter than their height (they overlap a little). */
const STACK_OVERLAP = 0.01;
const WALL_PIECE = 2;
const TORCH_REACH = 0.55;
/** No wall torch closer than this to the wooden gate (m): its own two frame it. */
const GATE_TORCHES = 9;
const TORCH_Y = 2.2;
/** Update 0.2.10 — a flooding room's floor cell has a lily pad this often. */
const LILY_PADS = 0.06;
const LILY_PAD = 'kit_n_Lilypad';

/** A turn that points a piece's front (+z) along a direction. */
const FACING: Record<Side, number> = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const DIRS: [number, number, Side][] = [
  [0, 1, 's'],
  [0, -1, 'n'],
  [1, 0, 'e'],
  [-1, 0, 'w'],
];

const height = (c: Cell) => HEIGHT[c] ?? 0;

export function dress(plan: FloorPlan): Dressing {
  const K = styleOf(plan.level);
  const WALL_DEPTH = K.wallDepth;
  const rng = createRng(plan.seed * 31 + plan.level);
  const pieces: Placement[] = [];
  const torches: Dressing['torches'] = [];
  const lava: Dressing['lava'] = [];
  const sand: SandCell[] = [];
  const floats: Placement[] = [];
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
      if (surface(c) && c !== 'lava' && !SANDY.has(c)) put(K.floor, x, K.floorY, z);
      // A pit's sides: a face down to the lava on every side of this cell that looks onto it (walls get theirs below).
      if (surface(c) && c !== 'lava') {
        for (const [dc, dr, side] of DIRS) {
          if (cellAt(plan, col + dc, row + dr) !== 'lava') continue;
          put(K.wall, x + dc * (CELL / 2 - WALL_DEPTH / 2), -LAVA_DEPTH, z + dr * (CELL / 2 - WALL_DEPTH / 2), FACING[side], 1, LAVA_DEPTH / WALL_PIECE, 1);
        }
      }
      switch (c) {
        case 'lava':
          lava.push({ x, z });
          if ((col * 3 + row * 5) % 11 === 0) torches.push({ x, y: -0.4, z });
          break;
        case 'wall':
          for (const [dc, dr, side] of DIRS) {
            const n = cellAt(plan, col + dc, row + dr);
            if (!surface(n) || n === 'door') continue;
            // The face between this wall and the floor beside it: three bricks high, capped.
            const fx = x + dc * (CELL / 2 - WALL_DEPTH / 2);
            const fz = z + dr * (CELL / 2 - WALL_DEPTH / 2);
            for (let k = 0; k < 3; k++) put(K.wall, fx, k * WALL_PIECE, fz, FACING[side]);
            // Standing in lava, its face goes down to it.
            if (n === 'lava') put(K.wall, fx, -LAVA_DEPTH, fz, FACING[side], 1, LAVA_DEPTH / WALL_PIECE, 1);
            put(K.cap, fx, 3 * WALL_PIECE, fz, FACING[side]);
            const room = inRoom[(row + dr) * GRID + col + dc];
            // (Not beside the wooden gate: it has its own pair.)
            const byGate = Math.hypot(x - plan.wayOut.doorX, z - plan.wayOut.doorZ) < GATE_TORCHES;
            // (Update 0.2.11 — none under water.)
            if (room >= 0 && K.under === undefined && (col * 3 + row * 5) % 7 === 0 && !nearDoor(col + dc, row + dr) && !byGate) {
              const tx = x + dc * (CELL / 2 + TORCH_REACH);
              const tz = z + dr * (CELL / 2 + TORCH_REACH);
              put(KIT.torch, tx, TORCH_Y, tz, FACING[side] - Math.PI / 2);
              torches.push({ x: x + dc * (CELL / 2 + 0.95), y: TORCH_Y + 1.2, z: z + dr * (CELL / 2 + 0.95) });
            } else if (room >= 0 && (col * 7 + row * 3) % 23 === 0) {
              put(K.decor, x + dc * (CELL / 2 + K.decorOut), K.decorY, z + dr * (CELL / 2 + K.decorOut), FACING[side]);
            }
          }
          break;
        case 'column':
          column(K, x, z, put);
          break;
        case 'sand':
        case 'palm':
        case 'cactus':
        case 'willow':
        case 'snag':
        case 'weed':
          dressSand(c, x, z, rng, put, sand);
          break;
        case 'low':
          // (Update 0.2.11 — or the look's own: floor 6's mossy boulders.)
          if (K.low) put(K.low, x, 0, z, rng() * Math.PI * 2, ...(K.lowScale ?? [1, 1, 1]));
          else put(KIT.crate, x, 0, z, Math.floor(rng() * 4) * (Math.PI / 2), 1.38, 1, 1.38);
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
          put(K.floor, x, h + K.floorY, z);
          for (const [dc, dr, side] of DIRS) {
            if (height(cellAt(plan, col + dc, row + dr)) >= h) continue;
            put(K.wall, x + dc * (CELL / 2 - WALL_DEPTH / 2), 0, z + dr * (CELL / 2 - WALL_DEPTH / 2), FACING[side], 1, h / WALL_PIECE, 1);
          }
          break;
        }
        case 'floor':
          // Update 0.2.10 — a lily pad now and then on a room the tide floods.
          if (K.water !== undefined && inRoom[row * GRID + col] >= 0 && plan.rooms[inRoom[row * GRID + col]].kind === 'fight' && rng() < LILY_PADS) {
            const s = 0.55 + 0.3 * rng();
            floats.push({ piece: LILY_PAD, x: x + (rng() - 0.5) * 1.2, y: 0, z: z + (rng() - 0.5) * 1.2, rot: rng() * Math.PI * 2, sx: s, sy: s, sz: s });
          }
          if (inRoom[row * GRID + col] >= 0 && !nearDoor(col, row) && rng() < 0.08) {
            // Litter against a wall.
            for (const [dc, dr] of DIRS) {
              if (cellAt(plan, col + dc, row + dr) !== 'wall') continue;
              put(K.litter[Math.floor(rng() * K.litter.length)], x + dc * 0.45, 0, z + dr * 0.45, rng() * Math.PI * 2);
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
      put(K.arch, x, 0, z, rot, ...K.archScale);
      if (K.over) put(K.over, x, K.overY, z, rot, ...K.overScale);
      gates.push({ x, z, rot, room: r.index });
      for (const k of [-1, 1]) {
        const ax = ns ? x + (k * CELL) / 2 : x;
        const az = ns ? z : z + (k * CELL) / 2;
        for (const face of [-1, 1]) {
          const fx = ns ? ax : ax + face * (CELL / 2 - WALL_DEPTH / 2);
          const fz = ns ? az + face * (CELL / 2 - WALL_DEPTH / 2) : az;
          const facing = ns ? (face > 0 ? FACING.s : FACING.n) : face > 0 ? FACING.e : FACING.w;
          put(K.wall, fx, 2 * WALL_PIECE, fz, facing);
          put(K.cap, fx, 3 * WALL_PIECE, fz, facing);
        }
      }
    }
  }
  dressShop(plan, put);
  // The way down: the wall over the wooden gate's doorway (on the room's side), a torch either side of it.
  const out = plan.wayOut;
  const ns = out.side === 'n' || out.side === 's';
  const [ox, oz] = out.side === 'n' ? [0, -1] : out.side === 's' ? [0, 1] : out.side === 'w' ? [-1, 0] : [1, 0];
  const inward: Side = out.side === 'n' ? 's' : out.side === 's' ? 'n' : out.side === 'w' ? 'e' : 'w';
  const gx = out.doorX;
  const gz = out.doorZ;
  const fx = gx - ox * (CELL / 2 - WALL_DEPTH / 2);
  const fz = gz - oz * (CELL / 2 - WALL_DEPTH / 2);
  for (const k of [-1, 1]) {
    const ax = ns ? fx + (k * CELL) / 2 : fx;
    const az = ns ? fz : fz + (k * CELL) / 2;
    put(K.wall, ax, 2 * WALL_PIECE, az, FACING[inward]);
    put(K.cap, ax, 3 * WALL_PIECE, az, FACING[inward]);
    // (Update 0.2.11 — none under water.)
    if (K.under !== undefined) continue;
    const tx = ns ? gx + k * 1.6 * CELL : gx - ox * (CELL / 2 + TORCH_REACH);
    const tz = ns ? gz - oz * (CELL / 2 + TORCH_REACH) : gz + k * 1.6 * CELL;
    put(KIT.torch, tx, TORCH_Y, tz, FACING[inward] - Math.PI / 2);
    torches.push({ x: ns ? tx : gx - ox * (CELL / 2 + 0.95), y: TORCH_Y + 1.2, z: ns ? gz - oz * (CELL / 2 + 0.95) : tz });
  }
  return { pieces, gates, torches, cores: coresOf(plan), lava, style: K, sand, floats };
}

/** A column: one piece, or a stack up to the columns' height (a bottom, middles, a top). */
function column(K: DungeonStyle, x: number, z: number, put: (piece: string, x: number, y: number, z: number) => void) {
  if (K.column.length === 1) {
    put(K.column[0], x, 0, z);
    return;
  }
  const [hb, hm, ht] = K.columnHeights;
  const middles = Math.max(0, Math.round((HEIGHT.column! - hb - ht) / hm));
  put(K.column[0], x, 0, z);
  for (let i = 0; i < middles; i++) put(K.column[1], x, hb + i * (hm - STACK_OVERLAP), z);
  put(K.column[2], x, hb + middles * (hm - STACK_OVERLAP), z);
}

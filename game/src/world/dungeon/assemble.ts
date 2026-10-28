// Update 0.0.12 — a laid-out floor (floorPlan.ts) as something to play in: the collision boxes (cells of a kind
// merged into big boxes), jump pads, a gate for every doorway (shut while its room fights), and per room: where its
// inside is, where enemies may appear, its gates, and an arena of just that room (with its gates shut) for the enemies'
// walk grid. Pure.
// Update 0.0.13 — chests (a box the size of the model, set back against its wall, facing into the room) and the shop's
// display tiles.
// Update 0.0.15 — the boss room: where its walls start (a smaller room, against the wall you come in by) and where
// they slide back to, the portal in its middle, the wooden gate in its far wall (shut until the boss is dead) and the
// dark beyond it.
import type { Arena, ArenaBox, BoxKind, JumpPad, Spot } from '../arena';
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID, PlacedRoom, Side } from './floorPlan';
import { OPPOSITE } from './wayOut';
import type { Cell, RoomKind } from './rooms';

/** Heights of what stands on a cell (m); the floor's top is y = 0. */
export const HEIGHT: Partial<Record<Cell, number>> = { wall: 6, column: 4.9, low: 1.3, high: 2.85, ledge: 1, highLedge: 2.5, spikes: 0.3, chest: 0.9 };
const BOX_KIND: Partial<Record<Cell, BoxKind>> = { wall: 'wall', column: 'block', low: 'block', high: 'block', ledge: 'block', highLedge: 'block', spikes: 'hazard' };
/** How far a jump pad throws you (m/s up): onto the high ledges with room to spare. */
export const PAD_LAUNCH = 15;
/** You're inside a room once this far in from its walls (m): the doorway itself doesn't count. */
const INSIDE = 1.5;
/** A gate's thickness (m), standing in the middle of its wall. */
const GATE_DEPTH = 0.6;
/** A chest's footprint (m: across its front, and front to back) and how far it sits back from its cell's middle. */
export const CHEST_W = 1.2;
export const CHEST_D = 0.9;
const CHEST_BACK = 0.4;
/** The boss room before its walls slide back: this many cells across the entrance wall, and deep. */
export const BOSS_START_W = 16;
export const BOSS_START_D = 14;

export interface Rect {
  min: { x: number; z: number };
  max: { x: number; z: number };
}

/** Update 0.0.15 — the boss room's layout. */
export interface BossLayout {
  room: number;
  /** The side you come in by. */
  entrance: Side;
  /** Its inside before the walls slide back, and after (m). */
  start: Rect;
  end: Rect;
  portal: { x: number; z: number };
  /** The wooden gate: its index in DungeonLevel.gates, where it stands, its turn, the way it opens (outward, into the
   *  dark), and the dark beyond it. */
  gate: number;
  gateAt: { x: number; z: number; rot: number; ox: number; oz: number };
  dark: Rect;
}

/** Update 0.0.13 — a chest: where it stands, its turn (its front, +z, into the room) and the way its front faces. */
export interface ChestSpot {
  room: number;
  x: number;
  z: number;
  rot: number;
  fx: number;
  fz: number;
}

export interface DungeonRoom {
  index: number;
  kind: RoomKind;
  depth: number;
  /** Its inside (world m) and the part of it that counts as in. */
  min: { x: number; z: number };
  max: { x: number; z: number };
  inMin: { x: number; z: number };
  inMax: { x: number; z: number };
  spawns: Spot[];
  /** Its doorways' gates (indices into DungeonLevel.gates) and which sides they're on. */
  gates: number[];
  sides: Side[];
  /** Just this room, gates shut: what its enemies walk on. */
  arena: Arena;
  /** Update 0.0.13 — its chest (an index into DungeonLevel.chests, −1: none) and its display tiles (the shop). */
  chest: number;
  tiles: Spot[];
}

export interface DungeonLevel {
  plan: FloorPlan;
  arena: Arena;
  gates: ArenaBox[];
  rooms: DungeonRoom[];
  exit: { x: number; z: number; radius: number };
  chests: ChestSpot[];
  boss: BossLayout;
}

const hasFloor = (c: Cell) => c !== 'void' && c !== 'wall';

/** Cells matching `match` merged into rectangles (greedy, row by row), each made into a box by `box`. */
function merge(plan: FloorPlan, match: (c: Cell) => boolean, box: (col: number, row: number, w: number, h: number, c: Cell) => ArenaBox, out: ArenaBox[]) {
  const done = new Uint8Array(GRID * GRID);
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const c = cellAt(plan, col, row);
      if (done[row * GRID + col] || !match(c)) continue;
      let w = 1;
      while (col + w < GRID && !done[row * GRID + col + w] && cellAt(plan, col + w, row) === c) w++;
      let h = 1;
      const rowFits = (r: number) => {
        for (let k = 0; k < w; k++) if (done[r * GRID + col + k] || cellAt(plan, col + k, r) !== c) return false;
        return true;
      };
      while (row + h < GRID && rowFits(row + h)) h++;
      for (let r = row; r < row + h; r++) for (let k = col; k < col + w; k++) done[r * GRID + k] = 1;
      out.push(box(col, row, w, h, c));
    }
  }
}

/** A box over cells (col, row)…(col + w − 1, row + h − 1) from y0 to y1. */
function cellsBox(col: number, row: number, w: number, h: number, y0: number, y1: number, kind: BoxKind): ArenaBox {
  return { x: cellX(col) + ((w - 1) * CELL) / 2, y: (y0 + y1) / 2, z: cellZ(row) + ((h - 1) * CELL) / 2, w: w * CELL, h: y1 - y0, d: h * CELL, kind };
}

/** The gate across a room's doorway on `side`. */
function gateBox(r: PlacedRoom, side: Side): ArenaBox {
  const { w, h } = r.layout;
  const wallH = HEIGHT.wall!;
  if (side === 'n' || side === 's') {
    const row = side === 'n' ? r.z0 - 1 : r.z0 + h;
    return { x: cellX(r.x0 + w / 2) - CELL / 2, y: wallH / 2, z: cellZ(row), w: 2 * CELL, h: wallH, d: GATE_DEPTH, kind: 'wall' };
  }
  const col = side === 'w' ? r.x0 - 1 : r.x0 + w;
  return { x: cellX(col), y: wallH / 2, z: cellZ(r.z0 + h / 2) - CELL / 2, w: GATE_DEPTH, h: wallH, d: 2 * CELL, kind: 'wall' };
}

/** A chest against the wall nearest its cell, its front into the room (a cell off any wall faces the middle). */
function chestSpot(r: PlacedRoom): ChestSpot {
  const [col, row] = r.chest!;
  const { w, h } = r.layout;
  let fx = 0;
  let fz = 0;
  if (row === 0) fz = 1;
  else if (row === h - 1) fz = -1;
  else if (col === 0) fx = 1;
  else if (col === w - 1) fx = -1;
  else if (Math.abs(col + 0.5 - w / 2) > Math.abs(row + 0.5 - h / 2)) fx = col < w / 2 ? 1 : -1;
  else fz = row < h / 2 ? 1 : -1;
  return { room: r.index, x: cellX(r.x0 + col) - fx * CHEST_BACK, z: cellZ(r.z0 + row) - fz * CHEST_BACK, rot: Math.atan2(fx, fz), fx, fz };
}

/** The boss room's inside before its walls slide back: BOSS_START_W × BOSS_START_D cells against its entrance wall. */
function bossStart(end: Rect, entrance: Side): Rect {
  const across = (BOSS_START_W * CELL) / 2;
  const deep = BOSS_START_D * CELL;
  const mx = (end.min.x + end.max.x) / 2;
  const mz = (end.min.z + end.max.z) / 2;
  switch (entrance) {
    case 'n':
      return { min: { x: mx - across, z: end.min.z }, max: { x: mx + across, z: end.min.z + deep } };
    case 's':
      return { min: { x: mx - across, z: end.max.z - deep }, max: { x: mx + across, z: end.max.z } };
    case 'w':
      return { min: { x: end.min.x, z: mz - across }, max: { x: end.min.x + deep, z: mz + across } };
    case 'e':
      return { min: { x: end.max.x - deep, z: mz - across }, max: { x: end.max.x, z: mz + across } };
  }
}

export function buildDungeon(plan: FloorPlan): DungeonLevel {
  const boxes: ArenaBox[] = [];
  merge(plan, hasFloor, (col, row, w, h) => cellsBox(col, row, w, h, -1, 0, 'floor'), boxes);
  merge(plan, (c) => BOX_KIND[c] !== undefined, (col, row, w, h, c) => cellsBox(col, row, w, h, 0, HEIGHT[c]!, BOX_KIND[c]!), boxes);
  // Chests: a box the size of the model (not the whole cell).
  const chests: ChestSpot[] = [];
  for (const r of plan.rooms) {
    if (!r.chest) continue;
    const c = chestSpot(r);
    chests.push(c);
    const across = c.fz !== 0;
    boxes.push({ x: c.x, y: HEIGHT.chest! / 2, z: c.z, w: across ? CHEST_W : CHEST_D, h: HEIGHT.chest!, d: across ? CHEST_D : CHEST_W, kind: 'block' });
  }
  const pads: JumpPad[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) if (cellAt(plan, col, row) === 'pad') pads.push({ x: cellX(col), y: 0, z: cellZ(row), radius: CELL * 0.45, launch: PAD_LAUNCH });
  }
  // The wooden gate: its box goes after every door's (their order is the dressing's), and into the boss room's arena.
  const out = plan.wayOut;
  const bossRoom = plan.rooms[out.room];
  const woodGate = gateBox(bossRoom, out.side);
  const gates: ArenaBox[] = [];
  const rooms: DungeonRoom[] = plan.rooms.map((r) => {
    const min = { x: cellX(r.x0) - CELL / 2, z: cellZ(r.z0) - CELL / 2 };
    const max = { x: min.x + r.layout.w * CELL, z: min.z + r.layout.h * CELL };
    const mine = r.doors.map((side) => gates.push(gateBox(r, side)) - 1);
    // Just this room: its floor, and every box touching it (walls, cover), with its gates shut.
    const near = boxes.filter((b) => b.kind !== 'floor' && b.x + b.w / 2 > min.x - CELL && b.x - b.w / 2 < max.x + CELL && b.z + b.d / 2 > min.z - CELL && b.z - b.d / 2 < max.z + CELL);
    const floor: ArenaBox = { x: (min.x + max.x) / 2, y: -0.5, z: (min.z + max.z) / 2, w: max.x - min.x, h: 1, d: max.z - min.z, kind: 'floor' };
    return {
      index: r.index,
      kind: r.kind,
      depth: r.depth,
      min,
      max,
      inMin: { x: min.x + INSIDE, z: min.z + INSIDE },
      inMax: { x: max.x - INSIDE, z: max.z - INSIDE },
      spawns: r.layout.spawns.map(([c, row]) => ({ x: cellX(r.x0 + c), y: 0, z: cellZ(r.z0 + row) })),
      gates: mine,
      sides: [...r.doors],
      arena: { name: `room ${r.index}`, boxes: [floor, ...near, ...mine.map((g) => gates[g]), ...(r.index === out.room ? [woodGate] : [])], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] },
      chest: chests.findIndex((c) => c.room === r.index),
      tiles: r.layout.tiles.map(([c, row]) => ({ x: cellX(r.x0 + c), y: 0, z: cellZ(r.z0 + row) })),
    };
  });
  const arena: Arena = { name: `Dungeon ${plan.level}`, boxes, pads, playerStart: { ...plan.start }, spawns: [], dummies: [], turrets: [] };
  const gate = gates.push(woodGate) - 1;
  const br = rooms[out.room];
  const end: Rect = { min: br.min, max: br.max };
  const [ox, oz] = out.side === 'n' ? [0, -1] : out.side === 's' ? [0, 1] : out.side === 'w' ? [-1, 0] : [1, 0];
  const boss: BossLayout = {
    room: out.room,
    entrance: OPPOSITE[out.side],
    start: bossStart(end, OPPOSITE[out.side]),
    end,
    portal: { x: (end.min.x + end.max.x) / 2, z: (end.min.z + end.max.z) / 2 },
    gate,
    gateAt: { x: woodGate.x, z: woodGate.z, rot: oz !== 0 ? 0 : Math.PI / 2, ox, oz },
    dark: { min: { x: cellX(out.x0) - CELL / 2, z: cellZ(out.z0) - CELL / 2 }, max: { x: cellX(out.x1) + CELL / 2, z: cellZ(out.z1) + CELL / 2 } },
  };
  return { plan, arena, gates, rooms, exit: { x: plan.exit.x, z: plan.exit.z, radius: CELL }, chests, boss };
}

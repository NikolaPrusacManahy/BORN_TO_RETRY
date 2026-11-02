// Update 0.0.12 — a laid-out floor (floorPlan.ts) as something to play in: the collision boxes (cells of a kind
// merged into big boxes), jump pads, a gate for every doorway (shut while its room fights), and per room: where its
// inside is, where enemies may appear, its gates, and an arena of just that room (with its gates shut) for the enemies'
// walk grid. Pure.
// Update 0.0.13 — chests (a box the size of the model, set back against its wall, facing into the room) and the shop's
// display tiles.
// Update 0.0.15 — the boss room: where its walls start (a smaller room, against the wall you come in by) and where
// they slide back to, the portal in its middle, the wooden gate in its far wall (shut until the boss is dead) and the
// dark beyond it.
// Update 0.0.20 — lava pits: no floor over a lava cell, its lava LAVA_DEPTH under the floor's level; the floor is that
// much thicker, so a pit's sides are solid.
// Update 0.2.0 — chests that rise out of the floor (the designer): the challenge room's once it's won, and the boss's,
// 3 m in front of the wooden gate, once the boss is dead. Until then they aren't there: their boxes are gates (solid
// once they're up), after the wooden gate's.
// Update 0.2.1 (the designer) — every room's chest rises once its room is won; a chest in a room with no mini boss
// (nothing there drops a key) is a gold chest: no key opens it, and it holds coins.
// Update 0.2.10 — floor 5's willows (a trunk's block, as a palm's), and the rooms its tide floods (`tide`: every fight
// room's inside, on a floor whose look is water).
import type { Arena, ArenaBox, BoxKind, JumpPad, Spot } from '../arena';
import { cellsBox, merge } from './cellBoxes';
import { HiveSpot, hivesOf, websOf } from './garden';
import { Lairs, lairsOf } from './lairs';
import { CELL, cellAt, cellX, cellZ, FloorPlan, GRID, PlacedRoom, Side } from './floorPlan';
import { OPPOSITE } from './wayOut';
import type { Cell, RoomKind } from './rooms';
import type { EnemyKind } from '../../sim/enemies/kinds';
import { styleOf } from './styles';
import { hasYeti } from '../../sim/dungeon/wavePlan';
// Update 0.2.4 — floor 4's desert: a palm's trunk and a cactus are narrow blocks in their cells (their sand is floor);
// quicksand is floor too, listed apart (DungeonLevel.sand) for the slow you feel in it.
// Update 0.2.23 — floor 2's Venom Garden (garden.ts): a tree's trunk is a willow's block; its webs and its hives.
// Update 0.2.24 — floor 3's Bone Keep: a crystal cluster is a block; each room's lairs (lairs.ts).

/** Heights of what stands on a cell (m); the floor's top is y = 0. */
export const HEIGHT: Partial<Record<Cell, number>> = { wall: 6, column: 4.9, low: 1.3, high: 2.85, ledge: 1, highLedge: 2.5, spikes: 0.3, chest: 0.9 };
const BOX_KIND: Partial<Record<Cell, BoxKind>> = { wall: 'wall', column: 'block', low: 'block', high: 'block', ledge: 'block', highLedge: 'block', spikes: 'hazard' };
/** Update 0.0.20 — a lava pit's depth: its lava's top under the floor's (m). */
export const LAVA_DEPTH = 1.6;
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
/** Update 0.2.0 — the boss's chest stands this far in front of the wooden gate's wall (m). */
export const BOSS_CHEST_OUT = 3;
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
  /** Update 0.2.0 — it rises out of the floor when its room is won (until then it isn't there); the boss's (it opens
   *  without a key and holds what the boss leaves); its box's index in DungeonLevel.gates (−1: always there). */
  rises: boolean;
  boss: boolean;
  gate: number;
  /** Update 0.2.1 — a gold chest: its room has no mini boss (no key drops there), so it opens without one; coins only. */
  gold: boolean;
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
  /** Update 0.0.16 — its waves (a fight room's, planned with the floor). */
  waves: EnemyKind[][];
  /** Update 0.0.21 — its perches: high-ledge spots where spitters stand (y: the ledge's top). */
  perches: Spot[];
  /** Update 0.1.20 — a challenge room (floorPlan.ts). */
  challenge: boolean;
  /** Update 0.2.24 — floor 3's graves, mushroom beds, burrows and crystals. */
  lairs: Lairs;
}

export interface DungeonLevel {
  plan: FloorPlan;
  arena: Arena;
  gates: ArenaBox[];
  rooms: DungeonRoom[];
  exit: { x: number; z: number; radius: number };
  chests: ChestSpot[];
  boss: BossLayout;
  /** Update 0.2.4 — the quicksand (flat areas on the floor). */
  sand: ArenaBox[];
  /** Update 0.2.10 — the rooms the tide floods (their insides; none on a dry floor). */
  tide: ArenaBox[];
  /** Update 0.2.23 — floor 2's webs (flat areas on the floor) and wasps' hives. */
  webs: ArenaBox[];
  hives: HiveSpot[];
}

/** Update 0.2.4 — a palm's trunk and a cactus: their blocks' sides and heights (m). */
const PALM = { side: 0.7, h: 5 };
const CACTUS = { side: 1.1, h: 2.2 };
/** Update 0.2.10 — a willow's trunk. Update 0.2.11 — a drowned tree's (floor 6). */
const WILLOW = { side: 0.8, h: 5 };
/** Update 0.2.24 — a crystal cluster's block. */
const CRYSTAL = { side: 1.2, h: 2.4 };

const hasFloor = (c: Cell) => c !== 'void' && c !== 'wall' && c !== 'lava';

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
  return { room: r.index, x: cellX(r.x0 + col) - fx * CHEST_BACK, z: cellZ(r.z0 + row) - fz * CHEST_BACK, rot: Math.atan2(fx, fz), fx, fz, rises: true, boss: false, gate: -1, gold: !r.challenge && !hasYeti(r.waves) };
}

/** A chest's box: the size of the model (not the whole cell). */
function chestBox(c: ChestSpot): ArenaBox {
  const across = c.fz !== 0;
  return { x: c.x, y: HEIGHT.chest! / 2, z: c.z, w: across ? CHEST_W : CHEST_D, h: HEIGHT.chest!, d: across ? CHEST_D : CHEST_W, kind: 'block' };
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

/** Update 0.3.10 — half a column's side: its look's stone; the Throne Hall's, with the skulls round it (keepDressing.ts). */
function columnHalf(plan: FloorPlan, col: number, row: number): number {
  const look = styleOf(plan.level);
  const throne = look.id === 'bone' && plan.rooms.some((r) => r.kind === 'boss' && col >= r.x0 && col < r.x0 + r.layout.w && row >= r.z0 && row < r.z0 + r.layout.h);
  return throne ? SKULL_PILLAR : (look.columnHalf ?? CELL / 2);
}
/** Its skulls stand out this far (m) from its middle. */
const SKULL_PILLAR = 0.85;

export function buildDungeon(plan: FloorPlan): DungeonLevel {
  const boxes: ArenaBox[] = [];
  merge(plan, hasFloor, (col, row, w, h) => cellsBox(col, row, w, h, -LAVA_DEPTH - 1, 0, 'floor'), boxes);
  merge(plan, (c) => c === 'lava', (col, row, w, h) => cellsBox(col, row, w, h, -LAVA_DEPTH - 1, -LAVA_DEPTH, 'lava'), boxes);
  merge(plan, (c) => BOX_KIND[c] !== undefined && c !== 'column', (col, row, w, h, c) => cellsBox(col, row, w, h, 0, HEIGHT[c]!, BOX_KIND[c]!), boxes);
  // (Update 0.3.9 — every column a pillar the pillar finisher can break. Update 0.3.10 — each its own box, as wide as
  // its stone, so a broken one's can change alone: sim/combat/pillars.ts.)
  const pillars: Arena['pillars'] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (cellAt(plan, col, row) !== 'column') continue;
      const half = columnHalf(plan, col, row);
      const h = HEIGHT.column!;
      boxes.push({ x: cellX(col), y: h / 2, z: cellZ(row), w: 2 * half, h, d: 2 * half, kind: 'block' });
      pillars.push({ x: cellX(col), z: cellZ(row), half, h, box: boxes.length - 1 });
    }
  }
  // Update 0.2.4 — the desert's palms and cacti; its quicksand.
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const c = cellAt(plan, col, row);
      const b = c === 'palm' ? PALM : c === 'cactus' ? CACTUS : c === 'crystal' ? CRYSTAL : c === 'willow' || c === 'snag' || c === 'tree' ? WILLOW : null;
      if (b) boxes.push({ x: cellX(col), y: b.h / 2, z: cellZ(row), w: b.side, h: b.h, d: b.side, kind: 'block' });
    }
  }
  const sand: ArenaBox[] = [];
  merge(plan, (c) => c === 'sand', (col, row, w, h) => cellsBox(col, row, w, h, -0.1, 0.1, 'accent'), sand);
  // Chests: a box the size of the model (one that rises: a gate, below).
  const chests: ChestSpot[] = [];
  for (const r of plan.rooms) {
    if (!r.chest) continue;
    const c = chestSpot(r);
    chests.push(c);
    if (!c.rises) boxes.push(chestBox(c));
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
      perches: r.layout.perches.map(([c, row]) => ({ x: cellX(r.x0 + c), y: HEIGHT.highLedge!, z: cellZ(r.z0 + row) })),
      waves: r.waves,
      challenge: r.challenge,
      lairs: lairsOf(r),
    };
  });
  const arena: Arena = { name: `Dungeon ${plan.level}`, boxes, pads, playerStart: { ...plan.start }, spawns: [], dummies: [], turrets: [], pillars };
  const gate = gates.push(woodGate) - 1;
  const br = rooms[out.room];
  const end: Rect = { min: br.min, max: br.max };
  const [ox, oz] = out.side === 'n' ? [0, -1] : out.side === 's' ? [0, 1] : out.side === 'w' ? [-1, 0] : [1, 0];
  // Update 0.2.0 — the boss's chest, in front of the wooden gate, facing into the room; then every rising chest's box.
  const out3 = CELL / 2 + BOSS_CHEST_OUT;
  br.chest = chests.push({ room: out.room, x: woodGate.x - ox * out3, z: woodGate.z - oz * out3, rot: Math.atan2(-ox, -oz), fx: -ox, fz: -oz, rises: true, boss: true, gate: -1, gold: false }) - 1;
  for (const c of chests) if (c.rises) c.gate = gates.push(chestBox(c)) - 1;
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
  const tide = styleOf(plan.level).water === undefined ? [] : rooms.filter((r) => r.kind === 'fight').map((r): ArenaBox => ({ x: (r.min.x + r.max.x) / 2, y: 0, z: (r.min.z + r.max.z) / 2, w: r.max.x - r.min.x, h: 0, d: r.max.z - r.min.z, kind: 'accent' }));
  return { plan, arena, gates, rooms, exit: { x: plan.exit.x, z: plan.exit.z, radius: CELL }, chests, boss, sand, tide, webs: websOf(plan), hives: hivesOf(plan) };
}

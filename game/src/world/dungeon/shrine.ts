// Update 0.3.32 — floor 8, the Shrine Dimension (shrineRooms.ts; MD/FLOOR8_SHRINE_PLAN.md): its pieces as the floor lays
// them out, their blocks and their dressing (the code-made pieces and More_nature's trees: export_dungeon_kit.py
// --shrine). Its trees stand in beds of earth, their trunks blocks: sakura (a carpet of fallen petals round each),
// maples, pines; bamboo clumps; stone lanterns, small shrines, a dojo's dummies and racks (blocks). Set pieces, each a
// rectangle of one letter: a torii (across its long side, its posts blocks), the shrine hall (facing the room's
// middle), a pagoda, a bell tower. Raked gravel and a dojo's planks are floor. Bridges over its ponds: decking, a red
// railing along the water (blocks: no falling off). A torii stands inside every doorway, where its posts' cells are
// clear. Pure.
import type { Rng } from '../../core/rng';
import type { ArenaBox } from '../arena';
import type { Put, SandCell } from './dressExtras';
import { CELL, cellAt, cellX, cellZ, colAt, FloorPlan, rowAt } from './floorPlan';
import { realmOf } from './floorOrder';
import type { Mark } from './gardenDressing';
import type { Cell } from './rooms';

export type ShrinePieceKind = 'torii' | 'hall' | 'pagoda' | 'bell';

/** A set piece: its middle and size (m), its turn, its scale, its room. */
export interface ShrinePiece {
  kind: ShrinePieceKind;
  x: number;
  z: number;
  w: number;
  d: number;
  turn: number;
  s: number;
  room: number;
}

export interface Shrine {
  pieces: ShrinePiece[];
  /** Its trees' trunks (m), and which. */
  trees: { x: number; z: number; kind: 'sakura' | 'maple' | 'pine' }[];
}

export const SHRINE_KIT = {
  sakura: Array.from({ length: 10 }, (_, i) => `kit_mn_Tree_${i + 1}`),
  maples: ['kit_mn_Birch_3', 'kit_mn_Birch_6', 'kit_mn_Birch_8'],
  pines: Array.from({ length: 5 }, (_, i) => `kit_mn_Pine_${i + 1}`),
  torii: 'kit_js_Torii',
  lantern: 'kit_js_StoneLantern',
  bamboo: 'kit_js_Bamboo',
  hokora: 'kit_js_Hokora',
  hall: 'kit_js_ShrineHall',
  pagoda: 'kit_js_Pagoda',
  bell: 'kit_js_BellTower',
  deck: 'kit_js_BridgeDeck',
  rail: 'kit_js_BridgeRail',
  gravel: 'kit_js_Gravel',
  planks: 'kit_js_Planks',
  dummy: 'kit_js_Dummy',
  rack: 'kit_js_Rack',
};

/** The pieces' sizes as they stand (m): a torii's width at its posts, the shrine hall's platform and roof, a pagoda's
 *  body (with its lowest eaves), a bell tower's base. */
const TORII_POSTS = 5;
const TORII_W = 6.9;
const HALL = { w: 15, d: 12, base: [12, 9] as const, h: 8.3 };
const PAGODA = { body: 6.5, h: 14.2 };
const BELL = { w: 3.2, base: 2.8, h: 4.3 };
/** Small blocks (m: across, deep, high): a trunk, a lantern, bamboo, a small shrine, a dummy, a rack (along x). */
const SMALL: Partial<Record<Cell, [number, number, number]>> = {
  sakura: [0.7, 0.7, 5],
  maple: [0.6, 0.6, 5],
  jpine: [0.8, 0.8, 5],
  lantern: [0.9, 0.9, 2.1],
  bamboo: [1.3, 1.3, 7],
  hokora: [1.4, 1.2, 1.9],
  dummy: [0.6, 0.6, 1.9],
  rack: [1.7, 0.4, 1.85],
};
const SET: Partial<Record<Cell, ShrinePieceKind>> = { torii: 'torii', hall: 'hall', pagoda: 'pagoda', bell: 'bell' };
/** A doorway's torii: this far in from the wall (m); the cells its posts stand in must be one of these. */
const DOOR_IN = 1;
const OPEN: ReadonlySet<Cell> = new Set<Cell>(['floor', 'moss', 'gravel', 'dojo']);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const block = (x: number, z: number, w: number, d: number, h: number): ArenaBox => ({ x, y: h / 2, z, w, h, d, kind: 'block' });
/** A rack's turn: from its cell, so its block and its piece agree. */
export const rackTurn = (col: number, row: number) => ((col + row) % 2) * (Math.PI / 2);

export const noShrine = (): Shrine => ({ pieces: [], trees: [] });

/** Is floor `plan` the Shrine Dimension? */
export const isShrine = (plan: FloorPlan) => realmOf(plan.level) === 'shrine';

/** The shrine of floor `plan` (empty on any other floor); every block goes into `boxes`. */
export function shrineOf(plan: FloorPlan, boxes: ArenaBox[]): Shrine {
  const shrine = noShrine();
  if (!isShrine(plan)) return shrine;
  for (const r of plan.rooms) {
    const { w, h, cells } = r.layout;
    const seen = new Uint8Array(w * h);
    const rx = cellX(r.x0) + ((w - 1) * CELL) / 2;
    const rz = cellZ(r.z0) + ((h - 1) * CELL) / 2;
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const c = cells[row * w + col];
        const x = cellX(r.x0 + col);
        const z = cellZ(r.z0 + row);
        const small = SMALL[c];
        if (small) {
          const turned = c === 'rack' && rackTurn(r.x0 + col, r.z0 + row) !== 0;
          boxes.push(block(x, z, turned ? small[1] : small[0], turned ? small[0] : small[1], small[2]));
          if (c === 'sakura' || c === 'maple' || c === 'jpine') shrine.trees.push({ x, z, kind: c === 'jpine' ? 'pine' : c });
          continue;
        }
        const kind = SET[c];
        if (!kind || seen[row * w + col]) continue;
        let pw = 0;
        while (col + pw < w && cells[row * w + col + pw] === c) pw++;
        let ph = 0;
        while (row + ph < h && cells[(row + ph) * w + col] === c) ph++;
        for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) seen[(row + j) * w + col + i] = 1;
        const p = setPiece(kind, x + ((pw - 1) * CELL) / 2, z + ((ph - 1) * CELL) / 2, pw * CELL, ph * CELL, rx, rz, r.index);
        shrine.pieces.push(p);
        for (const b of pieceBlocks(p)) boxes.push(b);
      }
    }
  }
  for (const rail of rails(plan)) boxes.push(block(rail.x, rail.z, rail.along ? CELL : 0.25, rail.along ? 0.25 : CELL, 1.1));
  for (const t of doorToriis(plan)) for (const b of pieceBlocks(t)) boxes.push(b);
  return shrine;
}

/** A set piece fitted to its rectangle: a torii across its long side; the hall facing the room's middle. */
function setPiece(kind: ShrinePieceKind, x: number, z: number, w: number, d: number, rx: number, rz: number, room: number): ShrinePiece {
  if (kind === 'torii') return { kind, x, z, w, d, turn: w >= d ? 0 : Math.PI / 2, s: Math.max(w, d) / (TORII_W + 1.1), room };
  if (kind === 'hall') {
    const dx = rx - x;
    const dz = rz - z;
    const turn = Math.abs(dx) > Math.abs(dz) + 1e-6 ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : dz < -1e-6 ? Math.PI : 0;
    const across = Math.abs(Math.sin(turn)) > 0.5;
    const s = clamp(Math.min((across ? d : w) / HALL.w, (across ? w : d) / HALL.d), 0.6, 1.4);
    return { kind, x, z, w, d, turn, s, room };
  }
  // (A pagoda its body to its rectangle: its roofs reach out over the rest.)
  if (kind === 'pagoda') return { kind, x, z, w, d, turn: 0, s: clamp(Math.min(w, d) / PAGODA.body, 0.6, 1.3), room };
  return { kind, x, z, w, d, turn: 0, s: clamp(Math.min(w, d) / BELL.w, 0.8, 1.6), room };
}

/** A set piece's blocks: a torii's two posts; the hall's platform; a pagoda's body and lowest eaves; a bell tower's base. */
export function pieceBlocks(p: ShrinePiece): ArenaBox[] {
  const s = p.s;
  if (p.kind === 'torii') {
    const ax = Math.cos(p.turn);
    const az = -Math.sin(p.turn);
    const half = (TORII_POSTS / 2) * s;
    return [-1, 1].map((k) => block(p.x + ax * half * k, p.z + az * half * k, 0.5 * s, 0.5 * s, 5 * s));
  }
  if (p.kind === 'hall') {
    const across = Math.abs(Math.sin(p.turn)) > 0.5;
    const [bw, bd] = HALL.base;
    return [block(p.x, p.z, (across ? bd : bw) * s, (across ? bw : bd) * s, 6 * s)];
  }
  if (p.kind === 'pagoda') return [block(p.x, p.z, PAGODA.body * s, PAGODA.body * s, PAGODA.h * s)];
  return [block(p.x, p.z, BELL.base * s, BELL.base * s, BELL.h * s)];
}

/** Its bridges' railings: an edge of a bridge cell (a boardwalk) onto the water. `along`: along x. */
function rails(plan: FloorPlan): { x: number; z: number; along: boolean; turn: number }[] {
  const out: { x: number; z: number; along: boolean; turn: number }[] = [];
  if (!isShrine(plan)) return out;
  for (const r of plan.rooms) {
    for (let row = 0; row < r.layout.h; row++) {
      for (let col = 0; col < r.layout.w; col++) {
        const gc = r.x0 + col;
        const gr = r.z0 + row;
        if (cellAt(plan, gc, gr) !== 'boardwalk') continue;
        for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
          if (cellAt(plan, gc + dc, gr + dr) !== 'lava') continue;
          const along = dc === 0;
          out.push({ x: cellX(gc) + (dc * CELL) / 2, z: cellZ(gr) + (dr * CELL) / 2, along, turn: along ? 0 : Math.PI / 2 });
        }
      }
    }
  }
  return out;
}

/** A torii inside each room's doorways (not the wooden gate's: it isn't a room's door), where its posts' cells are
 *  clear floor. */
function doorToriis(plan: FloorPlan): ShrinePiece[] {
  const out: ShrinePiece[] = [];
  if (!isShrine(plan)) return out;
  for (const r of plan.rooms) {
    const { w, h } = r.layout;
    for (const side of r.doors) {
      const ns = side === 'n' || side === 's';
      // The doorway's middle (between its two cells), a cell in.
      const x = ns ? cellX(r.x0 + w / 2) - CELL / 2 : side === 'w' ? cellX(r.x0) - CELL / 2 + DOOR_IN : cellX(r.x0 + w - 1) + CELL / 2 - DOOR_IN;
      const z = !ns ? cellZ(r.z0 + h / 2) - CELL / 2 : side === 'n' ? cellZ(r.z0) - CELL / 2 + DOOR_IN : cellZ(r.z0 + h - 1) + CELL / 2 - DOOR_IN;
      const p: ShrinePiece = { kind: 'torii', x, z, w: ns ? 6 * CELL : CELL, d: ns ? CELL : 6 * CELL, turn: ns ? 0 : Math.PI / 2, s: 1, room: r.index };
      const clear = pieceBlocks(p).every((b) => OPEN.has(cellAt(plan, colAt(b.x), rowAt(b.z))));
      if (clear) out.push(p);
    }
  }
  return out;
}

/** A cell of floor 8's own: its bed of earth (or moss), its tree, bamboo, lantern, small shrine, dummy, rack; raked
 *  gravel, a dojo's planks. The petals under a sakura go into `petals`. False: not one of them. */
export function dressShrineCell(c: Cell, x: number, z: number, col: number, row: number, boss: boolean, rng: Rng, put: Put, sand: SandCell[], petals: Mark[]): boolean {
  const turn = rng() * Math.PI * 2;
  switch (c) {
    case 'sakura': {
      sand.push({ x, z, quick: false });
      const s = (boss ? 1.45 : 1) * (0.95 + 0.3 * rng());
      put(SHRINE_KIT.sakura[Math.floor(rng() * SHRINE_KIT.sakura.length)], x, 0, z, turn, s, s, s);
      petals.push({ x, z, rot: rng() * Math.PI * 2, s: 4.5 * s });
      return true;
    }
    case 'maple': {
      sand.push({ x, z, quick: false });
      const s = 0.6 + 0.12 * rng();
      put(SHRINE_KIT.maples[Math.floor(rng() * SHRINE_KIT.maples.length)], x, 0, z, turn, s, s, s);
      return true;
    }
    case 'jpine': {
      sand.push({ x, z, quick: false });
      const s = 0.62 + 0.15 * rng();
      put(SHRINE_KIT.pines[Math.floor(rng() * SHRINE_KIT.pines.length)], x, 0, z, turn, s, s, s);
      return true;
    }
    case 'bamboo': {
      sand.push({ x, z, quick: false });
      const s = 0.9 + 0.2 * rng();
      put(SHRINE_KIT.bamboo, x, 0, z, turn, s, s, s);
      return true;
    }
    case 'moss':
      sand.push({ x, z, quick: false, ash: true });
      return true;
    case 'lantern':
      put(SHRINE_KIT.lantern, x, 0, z, Math.floor(rng() * 4) * (Math.PI / 2));
      return true;
    case 'hokora':
      put(SHRINE_KIT.hokora, x, 0, z, Math.floor(rng() * 4) * (Math.PI / 2));
      return true;
    // (A dojo's: on its planks.)
    case 'dummy':
      put(SHRINE_KIT.planks, x, 0, z, 0);
      put(SHRINE_KIT.dummy, x, 0, z, turn);
      return true;
    case 'rack':
      put(SHRINE_KIT.planks, x, 0, z, 0);
      put(SHRINE_KIT.rack, x, 0, z, rackTurn(col, row));
      return true;
    case 'gravel':
      put(SHRINE_KIT.gravel, x, 0, z, 0);
      return true;
    case 'dojo':
      put(SHRINE_KIT.planks, x, 0, z, 0);
      return true;
    case 'torii':
    case 'hall':
    case 'pagoda':
    case 'bell':
      return true;
    default:
      return false;
  }
}

/** Floor 8's own dressing: its set pieces, its bridges (decking, railings), the torii inside its doorways. */
export function dressShrine(plan: FloorPlan, rng: Rng, put: Put) {
  const shrine = shrineOf(plan, []);
  for (const p of shrine.pieces) {
    const piece = p.kind === 'torii' ? SHRINE_KIT.torii : p.kind === 'hall' ? SHRINE_KIT.hall : p.kind === 'pagoda' ? SHRINE_KIT.pagoda : SHRINE_KIT.bell;
    put(piece, p.x, 0, p.z, p.turn + (p.kind === 'pagoda' || p.kind === 'bell' ? Math.floor(rng() * 4) * (Math.PI / 2) : 0), p.s, p.s, p.s);
  }
  for (const t of doorToriis(plan)) put(SHRINE_KIT.torii, t.x, 0, t.z, t.turn, t.s, t.s, t.s);
  for (const r of plan.rooms) {
    for (let row = 0; row < r.layout.h; row++) {
      for (let col = 0; col < r.layout.w; col++) {
        const gc = r.x0 + col;
        const gr = r.z0 + row;
        if (cellAt(plan, gc, gr) !== 'boardwalk') continue;
        // Its planks across the way it runs (the bridge's longer way).
        const runsNs = cellAt(plan, gc, gr - 1) !== 'lava' || cellAt(plan, gc, gr + 1) !== 'lava';
        put(SHRINE_KIT.deck, cellX(gc), 0, cellZ(gr), runsNs ? 0 : Math.PI / 2);
      }
    }
  }
  for (const rail of rails(plan)) put(SHRINE_KIT.rail, rail.x, 0, rail.z, rail.turn);
}

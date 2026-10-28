// Update 0.0.12 — a floor of the dungeon, laid out from the run's seed (the designer: every run a bit different, the
// way Soul Knight's levels are). Rooms sit on a 5 × 5 board of slots: from the start room (bottom row) a winding path
// of five fight rooms leads to the way down, and side rooms branch off it. Each room is a hand-made layout
// (rooms.ts), varied per run; neighbours are joined by corridors through doors in the middle of their walls.
// Everything is stamped onto one grid of 2 m cells (the kit's module). Pure and seeded: the same seed, the same floor.
// Update 0.0.13 — rooms twice the size: each column of the board is as wide as its widest room and each row as tall as
// its tallest (so corridors stay short between rooms of different sizes). A shop hangs off the way, and one or two
// fight rooms hold a chest.
// Update 0.0.15 — the way ends in the boss room. The way down is a wooden gate in its far wall onto the dark
// (wayOut.ts): stepping into the dark ends the floor. The board's margin grew so that dark fits beside a room on the
// board's edge.
// Update 0.0.16 — each fight room's waves are planned here (its own seed, wavePlan.ts): every room with a Yeti gets a
// chest (the Yeti carries its key); one more chest in another fight room, sometimes two.
import { createRng, Rng } from '../../core/rng';
import type { EnemyKind } from '../../sim/enemies/kinds';
import { hasYeti, perchWaves, planWaves } from '../../sim/dungeon/wavePlan';
import { BOSS_ROOM, Cell, FIGHT_ROOMS, layOut, onFloor, RoomKind, RoomLayout, SHOP_ROOM, START_ROOM } from './rooms';
import { NO_WAY_OUT, stampWayOut, WayOut } from './wayOut';

/** Metres per cell; slots on the board; the largest room's side (cells); cells between neighbouring rooms' insides
 *  (their walls and the corridor); the floor grid's side (cells). */
export const CELL = 2;
export const SLOTS = 5;
export const MAX_ROOM = 36;
const GAP = 6;
const MARGIN = 4;
export const GRID = SLOTS * (MAX_ROOM + GAP) + MARGIN * 2;
/** Fight rooms on the way from the start to the way down. */
export const PATH_FIGHTS = 5;
/** Chance of a fight room off the way (besides the shop), and of a second chest on the floor. */
const SIDE_FIGHT = 0.6;
const SECOND_CHEST = 0.35;

export type Side = 'n' | 's' | 'w' | 'e';

export interface PlacedRoom {
  index: number;
  kind: RoomKind;
  layout: RoomLayout;
  slot: [number, number];
  /** Its inside's first cell (col, row) on the floor grid; its size is the layout's. */
  x0: number;
  z0: number;
  doors: Side[];
  /** Rooms from the start along the way (a side room: one more than the room it hangs off). */
  depth: number;
  /** Update 0.0.13 — its chest's cell (col, row inside the room), or null. */
  chest: [number, number] | null;
  /** Update 0.0.16 — a fight room's waves (none for the others). */
  waves: EnemyKind[][];
}

export interface Corridor {
  /** Its floor's cells, inclusive. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface FloorPlan {
  seed: number;
  /** Which floor of the run (1, 2, 3…). */
  level: number;
  cells: Cell[];
  rooms: PlacedRoom[];
  links: [number, number][];
  corridors: Corridor[];
  /** Where you start (feet, world m) facing the start room's door; the middle of the way down (the dark). */
  start: { x: number; y: number; z: number; yaw: number };
  exit: { x: number; z: number };
  /** Update 0.0.15 — the wooden gate and the dark beyond it. */
  wayOut: WayOut;
}

/** A cell's centre in the world (m): the grid is centred on the origin. */
export const cellX = (col: number) => (col + 0.5 - GRID / 2) * CELL;
export const cellZ = (row: number) => (row + 0.5 - GRID / 2) * CELL;
export const colAt = (x: number) => Math.floor(x / CELL + GRID / 2);
export const rowAt = (z: number) => Math.floor(z / CELL + GRID / 2);

export const cellAt = (plan: FloorPlan, col: number, row: number): Cell =>
  col < 0 || row < 0 || col >= GRID || row >= GRID ? 'void' : plan.cells[row * GRID + col];

const STEPS: [number, number, Side, Side][] = [
  [1, 0, 'e', 'w'],
  [-1, 0, 'w', 'e'],
  [0, 1, 's', 'n'],
  [0, -1, 'n', 's'],
];

const key = (s: [number, number]) => s[1] * SLOTS + s[0];
const inBoard = (c: number, r: number) => c >= 0 && r >= 0 && c < SLOTS && r < SLOTS;

/** The way: start on the bottom row, then a random walk of unvisited neighbours (retried until it's long enough). */
function wayThrough(rng: Rng): [number, number][] {
  const length = PATH_FIGHTS + 2;
  for (let attempt = 0; attempt < 100; attempt++) {
    const path: [number, number][] = [[Math.floor(rng() * SLOTS), SLOTS - 1]];
    const seen = new Set([key(path[0])]);
    while (path.length < length) {
      const [c, r] = path[path.length - 1];
      const open = STEPS.map(([dc, dr]) => [c + dc, r + dr] as [number, number]).filter(([nc, nr]) => inBoard(nc, nr) && !seen.has(key([nc, nr])));
      if (open.length === 0) break;
      const next = open[Math.floor(rng() * open.length)];
      seen.add(key(next));
      path.push(next);
    }
    if (path.length === length) return path;
  }
  // Never reached in practice: a snake up the board.
  return Array.from({ length }, (_, i) => [i % 2 === 0 ? 0 : 1, SLOTS - 1 - Math.floor(i / 2)] as [number, number]);
}

function sideTo(a: [number, number], b: [number, number]): [Side, Side] {
  const s = STEPS.find(([dc, dr]) => a[0] + dc === b[0] && a[1] + dr === b[1])!;
  return [s[2], s[3]];
}

/** Lays out floor `level` of the run with `seed`. */
export function planFloor(seed: number, level: number): FloorPlan {
  const rng = createRng(seed * 7919 + level * 104729);
  const way = wayThrough(rng);
  // Update 0.0.20 — only the rooms this floor has (the lava rooms come from floor 2; Update 0.0.21: floor 3 has only its
  // own).
  const fights = FIGHT_ROOMS.filter((t) => onFloor(t, level));
  for (let i = fights.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fights[i], fights[j]] = [fights[j], fights[i]];
  }
  const rooms: PlacedRoom[] = [];
  const links: [number, number][] = [];
  const taken = new Set<number>();
  const add = (kind: RoomKind, slot: [number, number], depth: number) => {
    const t = kind === 'start' ? START_ROOM : kind === 'boss' ? BOSS_ROOM : kind === 'shop' ? SHOP_ROOM : fights[rooms.filter((r) => r.kind === 'fight').length % fights.length];
    rooms.push({ index: rooms.length, kind, layout: layOut(t, rng), slot, x0: 0, z0: 0, doors: [], depth, chest: null, waves: [] });
    taken.add(key(slot));
    return rooms.length - 1;
  };
  way.forEach((slot, i) => {
    add(i === 0 ? 'start' : i === way.length - 1 ? 'boss' : 'fight', slot, i);
    if (i > 0) links.push([i - 1, i]);
  });
  // Side rooms off the fight rooms on the way: the shop (off the second to fourth fight room when it can), then
  // maybe a fight.
  const sideRoom = (kind: RoomKind, minDepth: number, maxDepth: number) => {
    const options: [number, [number, number]][] = [];
    for (const h of rooms) {
      if (h.kind !== 'fight' || h.depth < minDepth || h.depth > maxDepth) continue;
      for (const [dc, dr] of STEPS) {
        const s: [number, number] = [h.slot[0] + dc, h.slot[1] + dr];
        if (inBoard(s[0], s[1]) && !taken.has(key(s))) options.push([h.index, s]);
      }
    }
    if (options.length === 0) return false;
    const [host, slot] = options[Math.floor(rng() * options.length)];
    links.push([host, add(kind, slot, rooms[host].depth + 1)]);
    return true;
  };
  if (!sideRoom('shop', 2, 4)) sideRoom('shop', 1, PATH_FIGHTS);
  if (rng() < SIDE_FIGHT) sideRoom('fight', 1, PATH_FIGHTS);
  for (const r of rooms) if (r.kind === 'fight') r.waves = perchWaves(planWaves(r.depth, level, createRng(seed * 7717 + level * 131 + r.index * 17)), r.layout.perches.length);
  placeChests(rooms, rng);
  for (const [a, b] of links) {
    const [sa, sb] = sideTo(rooms[a].slot, rooms[b].slot);
    rooms[a].doors.push(sa);
    rooms[b].doors.push(sb);
  }
  placeRooms(rooms);
  const plan: FloorPlan = { seed, level, cells: new Array<Cell>(GRID * GRID).fill('void'), rooms, links, corridors: [], start: { x: 0, y: 0, z: 0, yaw: 0 }, exit: { x: 0, z: 0 }, wayOut: NO_WAY_OUT };
  for (const r of rooms) stampRoom(plan, r);
  for (const [a, b] of links) stampCorridor(plan, rooms[a], rooms[b]);
  plan.wayOut = stampWayOut(plan, rooms[way.length - 1]);
  const s = rooms[0];
  const yaw: Record<Side, number> = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 };
  plan.start = { x: cellX(s.x0) + ((s.layout.w - 1) * CELL) / 2, y: 0, z: cellZ(s.z0) + ((s.layout.h - 1) * CELL) / 2, yaw: yaw[s.doors[0]] };
  const o = plan.wayOut;
  plan.exit = { x: (cellX(o.x0) + cellX(o.x1)) / 2, z: (cellZ(o.z0) + cellZ(o.z1)) / 2 };
  return plan;
}

/** Update 0.0.13 — chests at one of their rooms' chest spots: Update 0.0.16, in every room with a Yeti; then one in
 *  another fight room, sometimes two. */
function placeChests(rooms: PlacedRoom[], rng: Rng) {
  const put = (r: PlacedRoom) => {
    const spot = r.layout.chestSpots[Math.floor(rng() * r.layout.chestSpots.length)];
    r.layout.cells[spot[1] * r.layout.w + spot[0]] = 'chest';
    r.chest = spot;
  };
  for (const r of rooms) if (r.kind === 'fight' && r.layout.chestSpots.length > 0 && hasYeti(r.waves)) put(r);
  const hosts = rooms.filter((r) => r.kind === 'fight' && r.layout.chestSpots.length > 0 && !r.chest);
  const count = Math.min(hosts.length, 1 + (rng() < SECOND_CHEST ? 1 : 0));
  for (let n = 0; n < count; n++) {
    const i = n + Math.floor(rng() * (hosts.length - n));
    [hosts[n], hosts[i]] = [hosts[i], hosts[n]];
    put(hosts[n]);
  }
}

/** Each board column as wide as its widest room, each row as tall as its tallest; rooms centred in their slot. */
function placeRooms(rooms: PlacedRoom[]) {
  const colW = new Array<number>(SLOTS).fill(0);
  const rowH = new Array<number>(SLOTS).fill(0);
  for (const r of rooms) {
    colW[r.slot[0]] = Math.max(colW[r.slot[0]], r.layout.w);
    rowH[r.slot[1]] = Math.max(rowH[r.slot[1]], r.layout.h);
  }
  const mids = (sizes: number[]) => {
    const out: number[] = [];
    let at = MARGIN;
    for (const s of sizes) {
      out.push(at + s / 2);
      if (s > 0) at += s + GAP;
    }
    return out;
  };
  const cx = mids(colW);
  const cz = mids(rowH);
  for (const r of rooms) {
    r.x0 = cx[r.slot[0]] - r.layout.w / 2;
    r.z0 = cz[r.slot[1]] - r.layout.h / 2;
  }
}

function set(plan: FloorPlan, col: number, row: number, c: Cell) {
  plan.cells[row * GRID + col] = c;
}

/** A room's inside, its walls, and its doors (the two middle cells of a side), with the way in kept clear. */
function stampRoom(plan: FloorPlan, r: PlacedRoom) {
  const { w, h, cells } = r.layout;
  for (let row = -1; row <= h; row++) {
    for (let col = -1; col <= w; col++) {
      const inside = row >= 0 && col >= 0 && row < h && col < w;
      set(plan, r.x0 + col, r.z0 + row, inside ? cells[row * w + col] : 'wall');
    }
  }
  for (const side of r.doors) {
    for (const k of [w / 2 - 1, w / 2]) {
      if (side === 'n' || side === 's') {
        const row = side === 'n' ? -1 : h;
        set(plan, r.x0 + k, r.z0 + row, 'door');
        for (const d of [1, 2]) set(plan, r.x0 + k, r.z0 + (side === 'n' ? d - 1 : h - d), 'floor');
      }
    }
    for (const k of [h / 2 - 1, h / 2]) {
      if (side === 'w' || side === 'e') {
        const col = side === 'w' ? -1 : w;
        set(plan, r.x0 + col, r.z0 + k, 'door');
        for (const d of [1, 2]) set(plan, r.x0 + (side === 'w' ? d - 1 : w - d), r.z0 + k, 'floor');
      }
    }
  }
}

/** The 4 m corridor between two neighbouring rooms' doors, walled on both sides. */
function stampCorridor(plan: FloorPlan, a: PlacedRoom, b: PlacedRoom) {
  const horizontal = a.slot[1] === b.slot[1];
  const [first, second] = (horizontal ? a.slot[0] < b.slot[0] : a.slot[1] < b.slot[1]) ? [a, b] : [b, a];
  if (horizontal) {
    const mid = first.z0 + first.layout.h / 2;
    const x0 = first.x0 + first.layout.w + 1;
    const x1 = second.x0 - 2;
    for (let col = x0; col <= x1; col++) {
      set(plan, col, mid - 1, 'floor');
      set(plan, col, mid, 'floor');
      for (const row of [mid - 2, mid + 1]) if (cellAt(plan, col, row) === 'void') set(plan, col, row, 'wall');
    }
    plan.corridors.push({ x0, z0: mid - 1, x1, z1: mid });
  } else {
    const mid = first.x0 + first.layout.w / 2;
    const z0 = first.z0 + first.layout.h + 1;
    const z1 = second.z0 - 2;
    for (let row = z0; row <= z1; row++) {
      set(plan, mid - 1, row, 'floor');
      set(plan, mid, row, 'floor');
      for (const col of [mid - 2, mid + 1]) if (cellAt(plan, col, row) === 'void') set(plan, col, row, 'wall');
    }
    plan.corridors.push({ x0: mid - 1, z0, x1: mid, z1 });
  }
}

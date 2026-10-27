// Update 0.0.12 — a floor of the dungeon, laid out from the run's seed (the designer: every run a bit different, the
// way Soul Knight's levels are). Rooms sit on a 5 × 5 board of slots: from the start room (bottom row) a winding path
// of five fight rooms leads to the way down, and one or two side rooms branch off it. Each room is a hand-made layout
// (rooms.ts), varied per run; neighbours are joined by 4 m corridors through doors in the middle of their walls.
// Everything is stamped onto one grid of 2 m cells (the kit's module). Pure and seeded: the same seed, the same floor.
import { createRng, Rng } from '../../core/rng';
import { Cell, EXIT_ROOM, FIGHT_ROOMS, layOut, RoomKind, RoomLayout, START_ROOM } from './rooms';

/** Metres per cell; slots on the board; cells from one slot's centre to the next; the floor grid's side (cells). */
export const CELL = 2;
export const SLOTS = 5;
export const PITCH = 22;
const MARGIN = 2;
export const GRID = SLOTS * PITCH + MARGIN * 2;
/** Fight rooms on the way from the start to the way down. */
export const PATH_FIGHTS = 5;

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
  /** Where you start (feet, world m) facing the start room's door; the middle of the way down. */
  start: { x: number; y: number; z: number; yaw: number };
  exit: { x: number; z: number };
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
  const fights = [...FIGHT_ROOMS];
  for (let i = fights.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fights[i], fights[j]] = [fights[j], fights[i]];
  }
  const rooms: PlacedRoom[] = [];
  const links: [number, number][] = [];
  const taken = new Set<number>();
  const add = (kind: RoomKind, slot: [number, number], depth: number) => {
    const t = kind === 'start' ? START_ROOM : kind === 'exit' ? EXIT_ROOM : fights[rooms.filter((r) => r.kind === 'fight').length % fights.length];
    const layout = layOut(t, rng);
    const cx = MARGIN + slot[0] * PITCH + PITCH / 2;
    const cz = MARGIN + slot[1] * PITCH + PITCH / 2;
    rooms.push({ index: rooms.length, kind, layout, slot, x0: cx - layout.w / 2, z0: cz - layout.h / 2, doors: [], depth });
    taken.add(key(slot));
    return rooms.length - 1;
  };
  way.forEach((slot, i) => {
    add(i === 0 ? 'start' : i === way.length - 1 ? 'exit' : 'fight', slot, i);
    if (i > 0) links.push([i - 1, i]);
  });
  // One or two side rooms off the fight rooms on the way.
  const sides = 1 + (rng() < 0.6 ? 1 : 0);
  for (let n = 0; n < sides; n++) {
    const hosts = rooms.filter((r) => r.kind === 'fight' && r.depth <= PATH_FIGHTS);
    const options: [number, [number, number]][] = [];
    for (const h of hosts) for (const [dc, dr] of STEPS) {
      const s: [number, number] = [h.slot[0] + dc, h.slot[1] + dr];
      if (inBoard(s[0], s[1]) && !taken.has(key(s))) options.push([h.index, s]);
    }
    if (options.length === 0) break;
    const [host, slot] = options[Math.floor(rng() * options.length)];
    links.push([host, add('fight', slot, rooms[host].depth + 1)]);
  }
  for (const [a, b] of links) {
    const [sa, sb] = sideTo(rooms[a].slot, rooms[b].slot);
    rooms[a].doors.push(sa);
    rooms[b].doors.push(sb);
  }
  const plan: FloorPlan = { seed, level, cells: new Array<Cell>(GRID * GRID).fill('void'), rooms, links, corridors: [], start: { x: 0, y: 0, z: 0, yaw: 0 }, exit: { x: 0, z: 0 } };
  for (const r of rooms) stampRoom(plan, r);
  for (const [a, b] of links) stampCorridor(plan, rooms[a], rooms[b]);
  const s = rooms[0];
  const yaw: Record<Side, number> = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 };
  plan.start = { x: cellX(s.x0) + ((s.layout.w - 1) * CELL) / 2, y: 0, z: cellZ(s.z0) + ((s.layout.h - 1) * CELL) / 2, yaw: yaw[s.doors[0]] };
  const e = rooms[way.length - 1];
  plan.exit = { x: cellX(e.x0) + ((e.layout.w - 1) * CELL) / 2, z: cellZ(e.z0) + ((e.layout.h - 1) * CELL) / 2 };
  return plan;
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

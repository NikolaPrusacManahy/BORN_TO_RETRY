// Update 0.0.12 — the dungeon's hand-made rooms (the designer: at least 8, with variations), drawn from above on the
// 2 m grid the kit is built for. Only the inside is drawn: the walls round it, and an arched door in the middle of
// any side a corridor reaches, are added when the floor is laid out (floorPlan.ts). North (the top row) is −z.
//   .  floor           #  wall (6 m)        C  column (5 m)       b  low cover (crates, 1.3 m)
//   B  high cover (2.9 m)  p  ledge (1 m)   P  high ledge (2.5 m) ^  spikes        J  jump pad
//   ?  low cover or floor, chosen per run   E  where enemies may appear (floor)
//   T  where a chest may stand (floor)      S  a shop's display tile (floor)
// The middle two cells of every side are kept clear two deep for the doors. Variations per run: mirrored either way,
// turned a quarter (square rooms), and every ? decided.
// Update 0.0.13 — the fight rooms are twice the size (fightRooms.ts); chests (T) and the shop room.
// Update 0.0.15 — the boss room replaces the exit room (and its trapdoor): the way down is now a wooden gate in its far
// wall, onto the dark (floorPlan.ts stamps the gate and the dark beyond it).
// Update 0.0.20 — L: a lava pit (lavaRooms.ts); a template may wait for a floor (`from`).
// Update 0.0.21 — U: a perch (a high ledge where a spitter stands: keepRooms.ts); a template may stop at a floor
// (`until`).
// Update 0.2.4 — floor 4's desert (desertRooms.ts): Q quicksand (floor you sink in), Y a palm and K a cactus, each in a
// bed of sand.
// Update 0.2.10 — floor 5's Drowned Temple (drownedRooms.ts): W a willow in a bed of mud (and no pits).
// Update 0.2.11 — floor 6's Sunken Grove (sunkenRooms.ts): D a drowned tree in a bed of silt, ~ seaweed in a bed of
// silt (floor).
import type { Rng } from '../../core/rng';
import { FIGHT_ROOMS as FIRST_ROOMS, quarter } from './fightRooms';
import { LAVA_ROOMS } from './lavaRooms';
import { KEEP_ROOMS } from './keepRooms';
import { DESERT_ROOMS } from './desertRooms';
import { DROWNED_ROOMS } from './drownedRooms';
import { SUNKEN_CHALLENGE, SUNKEN_ROOMS } from './sunkenRooms';

/** Every fight room (Update 0.0.20: the lava rooms too, from their floor on; Update 0.0.21: floor 3's). */
export const FIGHT_ROOMS: readonly RoomTemplate[] = [...FIRST_ROOMS, ...LAVA_ROOMS, ...KEEP_ROOMS, ...DESERT_ROOMS, ...DROWNED_ROOMS, ...SUNKEN_ROOMS, SUNKEN_CHALLENGE];

/** Update 0.0.21 — the rooms floor `floor` has. */
export const onFloor = (t: RoomTemplate, floor: number) => (t.from ?? 1) <= floor && floor <= (t.until ?? Infinity);

export type Cell = 'void' | 'floor' | 'wall' | 'column' | 'low' | 'high' | 'ledge' | 'highLedge' | 'spikes' | 'pad' | 'door' | 'dark' | 'tile' | 'chest' | 'lava' | 'sand' | 'palm' | 'cactus' | 'willow' | 'snag' | 'weed';
export type RoomKind = 'start' | 'fight' | 'boss' | 'shop';

export interface RoomTemplate {
  id: string;
  kind: RoomKind;
  rows: string[];
  /** Update 0.0.20 — the first floor it comes on (1 when not given). Update 0.0.21 — and the last. */
  from?: number;
  until?: number;
  /** Update 0.2.11 — only ever its floors' challenge room (never on the way): floor 6's drowned heart. */
  challenge?: boolean;
}

const CHAR: Record<string, Cell> = {
  '.': 'floor',
  '#': 'wall',
  C: 'column',
  b: 'low',
  B: 'high',
  p: 'ledge',
  P: 'highLedge',
  '^': 'spikes',
  J: 'pad',
  E: 'floor',
  '?': 'floor',
  T: 'floor',
  S: 'tile',
  L: 'lava',
  U: 'highLedge',
  Q: 'sand',
  Y: 'palm',
  K: 'cactus',
  W: 'willow',
  D: 'snag',
  '~': 'weed',
};

export const START_ROOM: RoomTemplate = {
  id: 'start',
  kind: 'start',
  rows: ['............', '............', '..b......b..', '............', '............', '............', '............', '............', '............', '..b......b..', '............', '............'],
};

/** Update 0.0.15 — the boss room (the designer: the walls slide back as the boss arrives): 60 m square, open in the
 *  middle (the portal), four columns and eight broken ones to run its charge into, a pad in each corner, and spots by
 *  the walls for the grunts it calls. Drawn as its top-left quarter. */
export const BOSS_ROOM: RoomTemplate = {
  id: 'boss',
  kind: 'boss',
  rows: quarter([
    '...............',
    '...............',
    '.........E.....',
    '...J...........',
    '...............',
    '............B..',
    '...............',
    '...............',
    '........C......',
    '..E............',
    '...............',
    '...............',
    '.....B.........',
    '...............',
    '...............',
  ]),
};

/** Update 0.0.13 — the shop (the designer: a room with five floor tiles, each showing something to buy). */
export const SHOP_ROOM: RoomTemplate = {
  id: 'shop',
  kind: 'shop',
  rows: [
    '................',
    '................',
    '..C..........C..',
    '................',
    '...S.S.S.S.S....',
    '................',
    '................',
    '................',
    '................',
    '..C..........C..',
    '................',
    '................',
  ],
};

/** A room as laid out for one run: its cells (row-major, w × h), where enemies may appear, and how it was varied. */
export interface RoomLayout {
  template: RoomTemplate;
  w: number;
  h: number;
  cells: Cell[];
  /** Cells (col, row) inside the room where enemies may appear. */
  spawns: [number, number][];
  /** Update 0.0.13 — where a chest may stand, and the shop's display tiles (in reading order). */
  chestSpots: [number, number][];
  tiles: [number, number][];
  /** Update 0.0.21 — perches (on high ledges): where spitters stand. */
  perches: [number, number][];
}

/** The template's characters, turned and mirrored: what's at (col, row) of the varied room. */
function sourceChar(t: RoomTemplate, col: number, row: number, turn: boolean, flipX: boolean, flipZ: boolean): string {
  const w = turn ? t.rows.length : t.rows[0].length;
  const h = turn ? t.rows[0].length : t.rows.length;
  let c = flipX ? w - 1 - col : col;
  let r = flipZ ? h - 1 - row : row;
  if (turn) [c, r] = [r, w - 1 - c];
  return t.rows[r][c];
}

/** One run's version of a template: mirrored and turned by the seed, every ? decided. */
export function layOut(t: RoomTemplate, rng: Rng): RoomLayout {
  const square = t.rows.length === t.rows[0].length;
  const turn = square && rng() < 0.5;
  const flipX = rng() < 0.5;
  const flipZ = rng() < 0.5;
  const w = turn ? t.rows.length : t.rows[0].length;
  const h = turn ? t.rows[0].length : t.rows.length;
  const cells: Cell[] = [];
  const spawns: [number, number][] = [];
  const chestSpots: [number, number][] = [];
  const tiles: [number, number][] = [];
  const perches: [number, number][] = [];
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const ch = sourceChar(t, col, row, turn, flipX, flipZ);
      if (ch === 'E') spawns.push([col, row]);
      if (ch === 'T') chestSpots.push([col, row]);
      if (ch === 'S') tiles.push([col, row]);
      if (ch === 'U') perches.push([col, row]);
      cells.push(ch === '?' ? (rng() < 0.5 ? 'low' : 'floor') : CHAR[ch] ?? 'floor');
    }
  }
  return { template: t, w, h, cells, spawns, chestSpots, tiles, perches };
}

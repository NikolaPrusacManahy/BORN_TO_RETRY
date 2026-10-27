// Update 0.0.12 — the dungeon's hand-made rooms (the designer: at least 8, with variations), drawn from above on the
// 2 m grid the kit is built for. Only the inside is drawn: the walls round it, and an arched door in the middle of
// any side a corridor reaches, are added when the floor is laid out (floorPlan.ts). North (the top row) is −z.
//   .  floor           #  wall (6 m)        C  column (5 m)       b  low cover (crates, 1.3 m)
//   B  high cover (2.9 m)  p  ledge (1 m)   P  high ledge (2.5 m) ^  spikes        J  jump pad
//   ?  low cover or floor, chosen per run   E  where enemies may appear (floor)    X  the way down (exit)
// The middle two cells of every side are kept clear two deep for the doors. Variations per run: mirrored either way,
// turned a quarter (square rooms), and every ? decided.
import type { Rng } from '../../core/rng';

export type Cell = 'void' | 'floor' | 'wall' | 'column' | 'low' | 'high' | 'ledge' | 'highLedge' | 'spikes' | 'pad' | 'door' | 'exit';
export type RoomKind = 'start' | 'fight' | 'exit';

export interface RoomTemplate {
  id: string;
  kind: RoomKind;
  rows: string[];
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
  X: 'exit',
};

export const START_ROOM: RoomTemplate = {
  id: 'start',
  kind: 'start',
  rows: ['........', '........', '..b..b..', '........', '........', '..b..b..', '........', '........'],
};

export const EXIT_ROOM: RoomTemplate = {
  id: 'exit',
  kind: 'exit',
  rows: ['..........', '.C......C.', '..........', '..........', '....XX....', '....XX....', '..........', '..........', '.C......C.', '..........'],
};

export const FIGHT_ROOMS: readonly RoomTemplate[] = [
  {
    id: 'colonnade',
    kind: 'fight',
    rows: [
      '..............',
      '.E..........E.',
      '..C..C..C..C..',
      '..............',
      '.?..E....E..?.',
      '..C........C..',
      '......bb......',
      '......bb......',
      '..C........C..',
      '.?..E....E..?.',
      '..............',
      '..C..C..C..C..',
      '.E..........E.',
      '..............',
    ],
  },
  {
    id: 'crossfire',
    kind: 'fight',
    rows: [
      '..............',
      '.^^.E....E.^^.',
      '.^^........^^.',
      '....bb..bb....',
      '.E..b....b..E.',
      '..............',
      '...?......?...',
      '...?......?...',
      '..............',
      '.E..b....b..E.',
      '....bb..bb....',
      '.^^........^^.',
      '.^^.E....E.^^.',
      '..............',
    ],
  },
  {
    id: 'altar',
    kind: 'fight',
    rows: [
      '................',
      '.E............E.',
      '..B..........B..',
      '................',
      '.....pp..pp.....',
      '....Jp....pJ....',
      '....p.PPPP.p....',
      '.E....PPPP....E.',
      '.E....PPPP....E.',
      '....p.PPPP.p....',
      '....Jp....pJ....',
      '.....pp..pp.....',
      '................',
      '..B..........B..',
      '.E............E.',
      '................',
    ],
  },
  {
    id: 'spike hall',
    kind: 'fight',
    rows: [
      '............',
      '.E........E.',
      '..C......C..',
      '............',
      '.^^^^..^^^^.',
      '............',
      '.?..E..E..?.',
      '............',
      '..^^....^^..',
      '..^^....^^..',
      '............',
      '.?..E..E..?.',
      '............',
      '.^^^^..^^^^.',
      '............',
      '..C......C..',
      '.E........E.',
      '............',
    ],
  },
  {
    id: 'ledges',
    kind: 'fight',
    rows: [
      'PPPPP......PPPPP',
      'PPPPP......PPPPP',
      'pppp...E....pppp',
      '...J..b..b..J...',
      '.E............E.',
      '......?..?......',
      '...b........b...',
      '...b........b...',
      '......?..?......',
      '.E............E.',
      '...J..b..b..J...',
      'pppp....E...pppp',
      'PPPPP......PPPPP',
      'PPPPP......PPPPP',
    ],
  },
  {
    id: 'maze',
    kind: 'fight',
    rows: [
      '..............',
      '.E..##..##..E.',
      '....##..##....',
      '..#........#..',
      '..#..?..?..#..',
      '..............',
      '.E..#....#..E.',
      '.E..#....#..E.',
      '..............',
      '..#..?..?..#..',
      '..#........#..',
      '....##..##....',
      '.E..##..##..E.',
      '..............',
    ],
  },
  {
    id: 'arena',
    kind: 'fight',
    rows: [
      '................',
      '.pppp......pppp.',
      '.pPPp..EE..pPPp.',
      '.pPPp......pPPp.',
      '.pppJ......Jppp.',
      '................',
      '.E....b??b....E.',
      '......?..?......',
      '......?..?......',
      '.E....b??b....E.',
      '................',
      '.pppJ......Jppp.',
      '.pPPp......pPPp.',
      '.pPPp..EE..pPPp.',
      '.pppp......pppp.',
      '................',
    ],
  },
  {
    id: 'twin',
    kind: 'fight',
    rows: [
      '............',
      '.E........E.',
      '..b......b..',
      '............',
      '.?...EE...?.',
      '............',
      '###..##..###',
      '............',
      '............',
      '###..##..###',
      '............',
      '.?...EE...?.',
      '............',
      '..b......b..',
      '.E........E.',
      '............',
    ],
  },
  {
    id: 'crypt',
    kind: 'fight',
    rows: [
      '..............',
      '.E..B....B..E.',
      '..............',
      '..B..b..b..B..',
      '.E....??....E.',
      '....b....b....',
      '..?..BBBB..?..',
      '..?..BBBB..?..',
      '....b....b....',
      '.E....??....E.',
      '..B..b..b..B..',
      '..............',
      '.E..B....B..E.',
      '..............',
    ],
  },
];

/** A room as laid out for one run: its cells (row-major, w × h), where enemies may appear, and how it was varied. */
export interface RoomLayout {
  template: RoomTemplate;
  w: number;
  h: number;
  cells: Cell[];
  /** Cells (col, row) inside the room where enemies may appear. */
  spawns: [number, number][];
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
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const ch = sourceChar(t, col, row, turn, flipX, flipZ);
      if (ch === 'E') spawns.push([col, row]);
      cells.push(ch === '?' ? (rng() < 0.5 ? 'low' : 'floor') : CHAR[ch] ?? 'floor');
    }
  }
  return { template: t, w, h, cells, spawns };
}

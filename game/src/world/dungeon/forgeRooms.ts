// Update 0.3.13 — floor 8's own rooms, The Forge (the plan for floors 7–10, MD/FLOORS_7_10_PLAN.md; the rooms are
// Claude's). Nine, each built round its machinery: H a crusher (cells side by side are one press: its hammer slams them
// on a beat, its shadow and a clank first), V a fire vent (a grate that jets fire on a timer, the vents of a room going
// in waves), belts (> < v A: they carry you, and enemies and bodies, the way they run), k a workbench, L lava pits
// again (wider than floors 1–2's), low cover (b: crates). Floor cells always join every door.
// Drawn as quarters like the others, mirrored right and down (`mirrored`: a belt's arrow turns with the mirror), or
// turned round the middle (`pinwheel`: each quarter the last turned a quarter, so belts can run in a ring). Floor 8
// only. Update 0.3.17 — retired from floor 8 (the Moon took it): on floor 10, unbuilt, kept for its echo rooms.
// (Update 0.3.25 — its floor is floorOrder.ts's: the floors were reordered.)
import type { RoomTemplate } from './rooms';
import { FLOOR } from './floorOrder';

/** A belt's arrow mirrored left–right, and up–down. */
const FLIP_X: Record<string, string> = { '>': '<', '<': '>' };
const FLIP_Z: Record<string, string> = { v: 'A', A: 'v' };
/** A belt's arrow turned a quarter clockwise (seen from above, north up). */
const TURN: Record<string, string> = { '>': 'v', v: '<', '<': 'A', A: '>' };

/** A room from its top-left quarter, mirrored right and down (fightRooms.ts's `quarter`, the arrows mirrored too). */
export function mirrored(rows: string[]): string[] {
  const half = rows.map((r) => r + [...r].reverse().map((c) => FLIP_X[c] ?? c).join(''));
  return [...half, ...[...half].reverse().map((r) => [...r].map((c) => FLIP_Z[c] ?? c).join(''))];
}

/** A room from its top-left quarter, turned round the middle: the top-right quarter is it turned a quarter clockwise,
 *  and so on round (the arrows turned with it). The doorways stay clear as `quarter`'s do. */
export function pinwheel(rows: string[]): string[] {
  const n = rows.length * 2;
  const out = Array.from({ length: n }, () => Array<string>(n).fill('.'));
  const turn = (c: string, k: number) => {
    for (let i = 0; i < k; i++) c = TURN[c] ?? c;
    return c;
  };
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      out[r][c] = ch;
      out[c][n - 1 - r] = turn(ch, 1);
      out[n - 1 - r][n - 1 - c] = turn(ch, 2);
      out[n - 1 - c][r] = turn(ch, 3);
    }),
  );
  return out.map((r) => r.join(''));
}

const room = (id: string, rows: string[], turned = false): RoomTemplate => ({ id, kind: 'fight', rows: turned ? pinwheel(rows) : mirrored(rows), from: FLOOR.hell, until: FLOOR.hell });

export const FORGE_ROOMS: readonly RoomTemplate[] = [
  // Presses in rows, slamming one after another; a pool of molten metal in the middle.
  room('smelting hall', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..HH....HH....',
    '..HH....HH....',
    '..............',
    '.E....b.....E.',
    '..............',
    '..HH..........',
    '..HH......E...',
    '..............',
    '.E.......LLLLL',
    '.........LLLLL',
    '.........LLLLL',
  ]),
  // A ring of belts round the room, turning; benches and crates inside it, vents in its corners.
  room(
    'belt loop',
    [
      '..............',
      '.E.....T......',
      '..............',
      '...>>>>>>>>>>>',
      '...A..........',
      '...A.V....k...',
      '...A..........',
      '...A...b......',
      '...A......E...',
      '...A..........',
      '...A..b.......',
      '...A.....E....',
      '.E.A..........',
      '...A..........',
    ],
    true,
  ),
  // A lake of lava: islands joined by narrow bridges (a knock on a bridge is a long way down).
  room('lava crossing', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..LLLLL.LLLLLL',
    '..LLLLL.LLLLLL',
    '..LL.......LLL',
    '..LL..E....LLL',
    '..LL.......LLL',
    '..LL...b...LLL',
    '..LLLL.LLLLLLL',
    '..LLLL.LLLLLLL',
    '..LLLL.....LLL',
    '.ELLLL...E....',
    '..LLLL........',
  ]),
  // The bellows: a field of fire vents going off in waves across the room.
  room('bellows', [
    '..............',
    '.E.....T......',
    '..............',
    '..V..V..V..V..',
    '..............',
    '.E....b.....E.',
    '..V..V..V..V..',
    '..............',
    '..........b...',
    '..V..V..V..V..',
    '.E............',
    '.......E......',
    '..V..V..V..V..',
    '..............',
  ]),
  // Two lines of belts running in from the walls to pits in the middle, a press over each line.
  room('foundry line', [
    '..............',
    '.E.....T......',
    '..............',
    '...k.....k..E.',
    '..............',
    '.E.......E....',
    '..............',
    '..>>>>HH>>>>LL',
    '..>>>>HH>>>>LL',
    '..............',
    '..............',
    '...b......b...',
    '.E.......E....',
    '..............',
  ]),
  // A workshop: rows of benches to fight round, vents between them, a small press or two.
  room('workshop', [
    '..............',
    '.E.....T......',
    '..............',
    '..kk....kk....',
    '..............',
    '.....V....V...',
    '.E............',
    '..kk....kk..E.',
    '..............',
    '.....V....H...',
    '..........H...',
    '..kk..E.......',
    '..............',
    '..............',
  ]),
  // One great press in the middle, slamming slow and wide; columns round it, lava in the corners.
  room('great press', [
    '..............',
    '.E.....T......',
    '..............',
    '..LLL.....C...',
    '..LLL.........',
    '..LLL.....E...',
    '..............',
    '..C...........',
    '.......b......',
    '.E............',
    '..........C...',
    '..............',
    '....E.......HH',
    '............HH',
  ]),
  // The furnace: a pool of lava in the middle, a belt ring turning round it.
  room(
    'furnace',
    [
      '..............',
      '.E.....T......',
      '..............',
      '..b.......E...',
      '..............',
      '.E...>>>>>>>>>',
      '.....A........',
      '.....A...E....',
      '.....A........',
      '.....A...LLLLL',
      '.....A...LLLLL',
      '..b..A...LLLLL',
      '.E...A...LLLLL',
      '.....A...LLLLL',
    ],
    true,
  ),
  // A gallery of single presses down a turning walk, vents between them.
  room(
    'press gallery',
    [
      '..............',
      '.E.....T......',
      '..............',
      '..H...H...H...',
      '..............',
      '....V...V.....',
      '..H.......H...',
      '..........E...',
      '.E..b.........',
      '..H...V...H...',
      '..............',
      '......E.......',
      '..H...H.......',
      '..............',
    ],
    true,
  ),
];

// Update 0.0.20 — fight rooms with lava (the designer: "new layouts with pits, like some rooms with lava pits in the
// middle", and "make proper use of wall run in some of the rooms"), from floor 2 on. Drawn as quarters like the others
// (fightRooms.ts), L being lava. A walkway round every pit joins every door, so a fight never needs a jump; the walls
// standing in the lava are for wall runs across it (a wall run carries about 13 m, a running jump about 9).
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';

const room = (id: string, rows: string[]): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: 2, until: 3 });

export const LAVA_ROOMS: readonly RoomTemplate[] = [
  // A lake round an island in the middle (16 m across), a bridge to it from either side (the enemies walk it; no
  // spot is safe from them); four walls reach out over the lava to its corners: run along one to get across.
  room('lava lake', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..b.......b...',
    '..............',
    '.E....E.......',
    '......LLLLLLLL',
    '..C...LLLLLLLL',
    '......LLLLLLLL',
    '......#####LLL',
    '.E....LLLL....',
    '......LLLL....',
    '..b...LLLL.b..',
    '..............',
  ]),
  // A channel of lava across the middle (16 m), walkways down both sides; four long walls stand across it: wall-run
  // over.
  room('lava bridges', [
    '.....T........',
    '.E.......E....',
    '..............',
    '...b......b...',
    '..............',
    '.E.....E......',
    '..............',
    '.....#....#...',
    '....L#LLLL#LLL',
    '....L#LLLL#LLL',
    '....L#LLLL#LLL',
    '....L#LLLL#LLL',
  ]),
  // Two lanes of lava between long walls (36 m, 6 m apart): run from wall to wall down a lane, or walk round.
  room('gauntlet', [
    '....T.......',
    '.E......E...',
    '............',
    '..b.....b...',
    '............',
    '.E....E.....',
    '............',
    '...#########',
    '...LLLLLLLLL',
    '...LLLLLLLLL',
    '...LLLLLLLLL',
    '...#########',
    '............',
    '.E.....b....',
    '............',
    '..E.........',
  ]),
];

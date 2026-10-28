// Update 0.0.21 — floor 3's own rooms (the designer: "scrap all of floor 3's levels copied from lower floors, keep the new
// ones and create more; you may add two floors inside a room, making use of enemies that attack from the distance and
// giving the player options to climb up and take them down"). Each has an upper floor: high ledges (P, 2.5 m) to walk
// along, with perches (U: a high ledge where a spitter stands and shoots down; sim/dungeon/roomLoop.ts puts them there).
// Ways up: steps (p, 1 m, then a jump), jump pads (J), and walls to run and jump from. Floor cells always join every door.
// Drawn as quarters like the others (fightRooms.ts).
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';

const room = (id: string, rows: string[]): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: 3 });

export const KEEP_ROOMS: readonly RoomTemplate[] = [
  // A raised square walk round a courtyard, open at the middle of each side; spitters on its corners and sides; steps
  // and a pad up from outside, a step up from the courtyard.
  room('the keep', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..b......b....',
    '.....PPPPPPPP.',
    '.....PUPPPUPP.',
    '.....PP.......',
    '....pPP...E...',
    '.....PPp......',
    '....JPU.......',
    '.....PP...b...',
    '.E...PP.......',
    '.....PP..E....',
    '..............',
  ]),
  // Ramparts along the walls (4 m wide, 2.5 m up) with spitters on them; an open middle with columns; steps and pads up
  // at the corners.
  room('ramparts', [
    'PPPPPPPPPPPP..',
    'PUPPPPPUPPPP..',
    'PP....T.......',
    'PP..b.........',
    'PUJ...E.......',
    'PP..........C.',
    'PPp...........',
    'PP.....J......',
    'PU...C........',
    'PP.........E..',
    'PP..E.........',
    'pp.....b......',
    '..............',
    '..............',
  ]),
  // Towers (2.5 m) with a spitter on each; a step up beside each, and a wall to run along and jump from.
  room('towers', [
    '....T.........',
    '.E.......E....',
    '..............',
    '...PPP........',
    '..pPUP...#....',
    '...PPP...#....',
    '.........#..E.',
    '.E............',
    '.......b......',
    '...J......PPP.',
    '..........PUP.',
    '.....E...pPPP.',
    '..............',
    '..............',
  ]),
  // Lava below, two raised bridges across it with spitters on them; steps up at the bridges' ends; walkways down the
  // sides.
  room('bridgeworks', [
    '.....T........',
    '.E.......E....',
    '..............',
    '..b.......b...',
    '..............',
    '.E....p.......',
    '......PPP.....',
    '....LLPUPLLLLL',
    '....LLPPPLLLLL',
    '....LLPPPLLLLL',
    '....LLPPPLLLLL',
    '....LLPUPLLLLL',
  ]),
];

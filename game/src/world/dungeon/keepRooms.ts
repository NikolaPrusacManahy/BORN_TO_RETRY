// Update 0.0.21 — floor 3's own rooms (the designer: "scrap all of floor 3's levels copied from lower floors, keep the new
// ones and create more; you may add two floors inside a room, making use of enemies that attack from the distance and
// giving the player options to climb up and take them down"). Each has an upper floor: high ledges (P, 2.5 m) to walk
// along, with perches (U: a high ledge where a spitter stands and shoots down; sim/dungeon/roomLoop.ts puts them there).
// Ways up: steps (p, 1 m, then a jump), jump pads (J), and walls to run and jump from. Floor cells always join every door.
// Drawn as quarters like the others (fightRooms.ts).
// Update 0.2.24 — the Bone Keep (boneRooms.ts): the ramparts and the towers stay (the Dragonlings' perches), dressed
// as the rest of the floor; the keep and the bridgeworks are retired.
// (Update 0.3.25 — its floor is floorOrder.ts's: the floors were reordered.)
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';
import { FLOOR } from './floorOrder';

const room = (id: string, rows: string[]): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: FLOOR.keep, until: FLOOR.keep });

export const KEEP_ROOMS: readonly RoomTemplate[] = [
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
];

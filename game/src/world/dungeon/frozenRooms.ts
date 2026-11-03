// Update 0.3.11 — floor 7's own rooms, Frozen Depths (the plan for floors 7–10, MD/FLOORS_7_10_PLAN.md; the rooms are
// Claude's). Nine, each with its own idea, built round its ice: I a sheet of ice over the stone (you slide on it: what
// you start keeps going, stopping and turning take long; an enemy knocked onto it slides far), F a snowy tree in a bed
// of snow, n a bed of snow (stumps, rocks, bushes now and then); crystal clusters (x), snowy rocks for low cover (b).
// Trees grow out of snow, never out of paving. Icicles hang along every fight room's walls (frozen.ts). Floor cells
// always join every door. Drawn as quarters like the others (fightRooms.ts). Floor 7 only.
// (Update 0.3.25 — its floor is floorOrder.ts's: the floors were reordered.)
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';
import { FLOOR } from './floorOrder';

const room = (id: string, rows: string[]): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: FLOOR.frozen, until: FLOOR.frozen });

export const FROZEN_ROOMS: readonly RoomTemplate[] = [
  // A frozen pond in the middle (a rink 28 m across), pines in snow round it.
  room('frozen courtyard', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..FnF.....n...',
    '..nnn.........',
    '..F.F...b.....',
    '.E............',
    '.......IIIIIII',
    '.......IIIIIII',
    '..b....IIIIIII',
    '.......IIIIIII',
    '..n....IIIIIII',
    '.....E.IIIIIII',
    '.......IIIIIII',
  ]),
  // A great hall frozen over: a colonnade round its edge, a lake of ice inside with a rock or two and a crystal.
  room('ice lake hall', [
    '..............',
    '.E...T....E...',
    '..C...C...C...',
    '..............',
    '..C..IIIIIIIII',
    '....IIIIIIIIII',
    '..C.IIIbIIIIII',
    '....IIIIIIIIII',
    '.E..IIIIIIIxII',
    '....IIIIIIIIII',
    '..C.IIIIIIIIII',
    '....IIIIIIIIII',
    '..............',
    '..............',
  ]),
  // Crystal clusters to hide behind and blink to; ice running between them.
  room('crystal cavern', [
    '..............',
    '.E.....T......',
    '..xx.....x....',
    '..x...........',
    '.....IIII.....',
    '.x..IIxxII..E.',
    '....IIxIII....',
    '.E...IIII..x..',
    '..........xx..',
    '..x...........',
    '..xx...E.IIIII',
    '.......IIIIIII',
    '.......IIxIIII',
    '.......IIIIIII',
  ]),
  // A chapel snowed in: two rows of columns, drifts along its walls, its aisle frozen.
  room('snowed-in chapel', [
    '..............',
    '.nnn...T...n..',
    '.n........E...',
    '..C...C...C...',
    '..............',
    '.E......IIIIII',
    '..C...C.IIIIII',
    '........IIIIII',
    '..C...C.IIIIII',
    '.n......IIIIII',
    '.nn.E...IIIIII',
    '..C...C.IIIIII',
    '..............',
    '..............',
  ]),
  // A pine wood: trees and snow everywhere, lanes between them, a frozen clearing in the middle.
  room('pine wood', [
    '..............',
    '.E...T......E.',
    '..F...F...F...',
    '..nn..n..nn...',
    '....F.....F...',
    '.F..n..F......',
    '..E...nn...F..',
    '....F......n..',
    '.n..n..F.E....',
    '..F.......IIII',
    '.....F...IIIII',
    '.E..nn...IIIII',
    '.........IIIII',
    '.........IIIII',
  ]),
  // A long lane of ice through the middle from door to door, banks of snow and pines either side.
  room('the long ice', [
    '..........II..',
    '.E...T....II..',
    '..nnn.....IIII',
    '..nFn..b..IIII',
    '..nnn.....IIII',
    '..........IIII',
    '.E....b...IIII',
    '..........IIII',
    '..nnn.....IIII',
    '..nFn..E..IIII',
    '..nnn.....IIII',
    '..........IIII',
    '..........IIII',
    '..........IIII',
  ]),
  // A raised floor in the middle (1 m) with a crystal on each side, a ring of ice round it.
  room('glacier ring', [
    '..............',
    '.E.....T......',
    '..b.......E...',
    '..............',
    '....IIIIIIIIII',
    '....IIIIIIIIII',
    '.E..IIIIIIIIII',
    '....IIIIIIIIII',
    '....IIIIpppppp',
    '..b.IIIIpppppp',
    '....IIIIppxppp',
    '....IIIIpppppp',
    '.....E..pppppp',
    '........pppppp',
  ]),
  // Dead trees in the snow, stumps, ice in patches between them.
  room('dead grove', [
    '..............',
    '.E..T.....E...',
    '..F....n......',
    '...n..F..III..',
    '.F.....IIIII..',
    '.....nIIIF....',
    '..E...III...F.',
    '.n..F.........',
    '.....b...F..E.',
    '..F......nn...',
    '....III.......',
    '.E.IIIIIF.....',
    '....III.......',
    '..............',
  ]),
  // Lanes of ice across the room with rocks on them, a hedge of snow and pines between: the slide across is open.
  room('frozen lanes', [
    '..............',
    '.E...T.....E..',
    '..bb.....bb...',
    '..............',
    '..IIIIIIIIIIII',
    '..IIbIIIIbIIII',
    '..IIIIIIIIIIII',
    '.E............',
    '..nnFnn..nnFnn',
    '..............',
    '..IIIIIIIIIIII',
    '..IIIbIIIIIbII',
    '..............',
    '..............',
  ]),
];

// Update 0.3.32 — floor 8, the Shrine Dimension (the designer: "Japan theme … Sakura trees and a shrine and this kind of
// thing, loads of sakura leaves"; the plan, MD/FLOOR8_SHRINE_PLAN.md; the rooms are Claude's). Nine, each round its own
// idea: a sakura in a bed of earth, a carpet of its petals round it; + a bed of moss; e a maple; j a pine; i a clump
// of bamboo; l a stone lantern; % a small shrine; ! a training dummy and | a weapon rack (a dojo's); N raked gravel and
// : a dojo's planks (floor); L a pond (deep water: what falls in drowns) and = a bridge over it (its railing along the
// water); U a perch (a high ledge); set pieces, each a rectangle of one letter: t a torii (across its long side: walk
// under it), @ the shrine hall, $ a pagoda, & a bell tower. A torii stands inside every doorway too (shrine.ts). Floor
// cells always join every door; lanes 4 m wide at least between blocks (the enemies' pathing). Drawn as quarters like
// the others (fightRooms.ts). Floor 8 only.
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';
import { FLOOR } from './floorOrder';

const room = (id: string, rows: string[]): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: FLOOR.shrine, until: FLOOR.shrine });

export const SHRINE_ROOMS: readonly RoomTemplate[] = [
  // A way of torii from door to door, lanterns along it, sakura in the corners.
  room('the torii path', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..+++.....l.tt',
    '..+a+.........',
    '..+++.........',
    '..........l.tt',
    '.E............',
    '..............',
    '..+++.....l.tt',
    '..+a+.........',
    '..+++.........',
    '......t..t....',
    '......t..t....',
  ]),
  // Sakura in beds of moss, lanterns among them, small shrines in the middle.
  room('the sakura grove', [
    '..............',
    '.E.....T......',
    '..+++....+++..',
    '..+a+....+a+..',
    '..+++....+++..',
    '......l.......',
    '.E............',
    '..+++....+++..',
    '..+a+....+a+..',
    '..+++....+++..',
    '..............',
    '......+++.....',
    '......+a+.....',
    '.E....+++....%',
  ]),
  // Raked gravel, mossy rocks in it, pines at its edge.
  room('the zen garden', [
    '..............',
    '.E.....T......',
    '..NNNNNNNN....',
    '..NNNNNNNN..j.',
    '..NNbNNNNN....',
    '..NNNNNbNN....',
    '..NNNNNNNN....',
    '.E............',
    '..j......NNNNN',
    '.........NNNNN',
    '.........NNbNN',
    '..j......NNNNN',
    '.........NNNNN',
    '.E.......NNNNN',
  ]),
  // Four ponds round a crossing of bridges, maples about them.
  room('the koi pond', [
    '..............',
    '.E.....T......',
    '..............',
    '..e.......e...',
    '..............',
    '.....l........',
    '.E............',
    '.......LLLLLL=',
    '..e....LLLLLL=',
    '.......LLLLLL=',
    '.......LLLLLL=',
    '.....l.LLLLLL=',
    '.......LLLLLL=',
    '.E.....=======',
  ]),
  // Clumps of bamboo with wide lanes between, a sakura in a clearing.
  room('the bamboo forest', [
    '..............',
    '.E.....T......',
    '..ii..ii..ii..',
    '..ii..ii..ii..',
    '..............',
    '..............',
    '..ii..ii..ii..',
    '.Eii..ii..ii..',
    '..............',
    '..............',
    '..ii..ii..+++.',
    '..ii..ii..+a+.',
    '..........+++.',
    '.E............',
  ]),
  // A training hall: its floor planks, dummies, racks of staffs.
  room('the dojo', [
    '..............',
    '.E.....T......',
    '..::::::::::::',
    '..::!:::::!:::',
    '..::::::::::::',
    '..::::|:::::::',
    '..::::::::::::',
    '.E::!:::::::::',
    '..::::::::::::',
    '..::::::!:::::',
    '..::::::::::::',
    '..::|::::::|::',
    '..::::::::::::',
    '.E::::::::::::',
  ]),
  // Raised stone terraces, lanterns round them, perches in the corners, small shrines in the middle.
  room('the lantern steps', [
    '..............',
    '.E.....T......',
    '..............',
    '..UU......l...',
    '..UU..........',
    '..J...........',
    '.E............',
    '..l....pppp...',
    '.......pppp.l.',
    '.......pppp...',
    '.......pppp...',
    '..l...........',
    '............%.',
    '.E............',
  ]),
  // A pagoda in the middle, sakura round it, perches for its archers.
  room('the pagoda court', [
    '..............',
    '.E.....T......',
    '..............',
    '..+++.....l...',
    '..+a+.........',
    '..+++.........',
    '.E.......UU...',
    '.........UU...',
    '..l...........',
    '..............',
    '..+++.........',
    '..+a+.....l...',
    '..+++.......$$',
    '.E..........$$',
  ]),
  // Maples, small ponds framed in moss, a bell tower in the middle.
  room('the tea garden', [
    '..............',
    '.E.....T......',
    '..e.......e...',
    '..............',
    '..++++........',
    '..+LL+...l....',
    '.E+LL+........',
    '..++++........',
    '..........+++.',
    '..e.......+e+.',
    '..........+++.',
    '.....l........',
    '............&&',
    '.E..........&&',
  ]),
];

/** Its boss room, the Great Shrine: 60 m square, four great sakura, lanterns, a great torii over each way in, its
 *  middle clear. (Its boss is the designer's to redesign: a stand-in meanwhile.) */
export const SHRINE_BOSS_ROOM: RoomTemplate = {
  id: 'the great shrine',
  kind: 'boss',
  rows: quarter([
    '...............',
    '...............',
    '.........E.....',
    '..+++..........',
    '..+a+.......ttt',
    '..+++..........',
    '.......l.......',
    '...............',
    '..E.....l......',
    '...............',
    '...............',
    '..l............',
    '....t....E.....',
    '....t..........',
    '....t..........',
  ]),
};

// Update 0.2.24 — floor 3's own rooms, the Bone Keep (the designer: floors "need to match their enemies"; the theme and
// the rooms are Claude's, as accepted): the stone keep become a graveyard-castle, each room built round one of the
// floor's enemies. Skeletons climb out of open graves (g); Mushnubs come out of glowing mushroom beds (m); White
// Rabbits pop out of their burrows (o); Skull Wraiths blink from crystal to crystal (x); a Ninja has long open lines
// to be seen in; the Dragonlings keep the ramparts and towers (keepRooms.ts). Stone tombs (b) are the low cover. Lava
// stays under the bone bridges. Drawn as quarters like the others (fightRooms.ts). Floor 3's only.
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';

const room = (id: string, rows: string[]): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: 3, until: 3 });

export const BONE_ROOMS: readonly RoomTemplate[] = [
  // Alcoves along the walls, a grave in each; more graves and tombs in the open middle.
  room('ossuary', [
    '...T..........',
    '.E.......E....',
    '..............',
    '.#g#g#........',
    '.#.#.#...b....',
    '..........E...',
    '.#g#..........',
    '.#.#....C.....',
    '.......g.g....',
    '.E............',
    '.......g.g....',
    '...b..........',
    '.E............',
    '..............',
  ]),
  // An open court in rows of graves: the dead climb out all round you.
  room('graveyard court', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..g.g.g...g.g.',
    '..............',
    '..g.g.g...g.g.',
    '.E............',
    '.....b....b...',
    '..g.g.g.......',
    '.........E....',
    '..g.g.g...g.g.',
    '..............',
    '.E........g.g.',
    '..............',
  ]),
  // Rows of stone tombs between columns; raised galleries at the ends with perches for the Dragonlings.
  room('tomb hall', [
    '...T..........',
    '.E.......E....',
    '..............',
    'PPPP..bb..bb..',
    'PUPP..........',
    'PPPP..bb..bb..',
    'pp............',
    '......C...C...',
    '.E............',
    '......bb..bb..',
    '..............',
    '......bb..bb..',
    '.E..........E.',
    '..............',
  ]),
  // Beds of glowing mushrooms the Mushnubs grow out of, columns between them.
  room('fungal crypt', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..mmm.....mm..',
    '..mmm..C..mm..',
    '..mm..........',
    '.E.......mmm..',
    '.........mmm..',
    '..C.....E.....',
    '..............',
    '....mm......mm',
    '....mmm....mmm',
    '.E..........m.',
    '..............',
  ]),
  // The White Rabbits' warren: burrows all over the floor, a few tombs to hide behind from their carrots.
  room('warren', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..o.....o.....',
    '.......b......',
    '.....o.....o..',
    '.E............',
    '...b......o...',
    '..o....E......',
    '.........b....',
    '.....o......o.',
    '..............',
    '.E.......o....',
    '..............',
  ]),
  // Crystal clusters about an open shrine: the Skull Wraiths blink from one to the next.
  room('crystal shrine', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..x.......x...',
    '..............',
    '.......b......',
    '.E..........x.',
    '..............',
    '.....x........',
    '..........E...',
    '..b...........',
    '.E.......x....',
    '..............',
    '..............',
  ]),
  // The warden's court: long open lines and columns only along its walls, so a Ninja is seen wherever it lands.
  room('wardens court', [
    '...T..........',
    '.E.......E....',
    '..............',
    '..C...C...C...',
    '..............',
    '..............',
    '.E..........E.',
    '..............',
    '..C.......b...',
    '..............',
    '..............',
    '.E....E.......',
    '..C...........',
    '..............',
  ]),
  // Lava below a raised cross of bone-white stone (1 m up: jump onto it), bridges to it, walls in the lava to run.
  room('bone bridges', [
    '.....T........',
    '.E.......E....',
    '..............',
    '..b.......b...',
    '..............',
    '.E....pp......',
    '......pp......',
    '....LLppLL#LLL',
    '....LLppLL#LLL',
    '....LLppLL#LLL',
    '....LLpppppppp',
    '....LLpppppppp',
  ]),
];

/** The Throne Hall: floor 3's boss room (the Bone King's), as rooms.ts's BOSS_ROOM but pillared: two rows of skull
 *  pillars down it (dressing.ts hangs the skulls), candelabra along its walls. */
export const THRONE_ROOM: RoomTemplate = {
  id: 'throne hall',
  kind: 'boss',
  rows: quarter([
    '...............',
    '...............',
    '.........E.....',
    '...J...........',
    '...............',
    '....C.......C..',
    '...............',
    '...............',
    '....C.......C..',
    '..E............',
    '...............',
    '....C.......C..',
    '...............',
    '...............',
    '...............',
  ]),
};

// Update 0.3.14 — floor 6 reworked: Skull Cove, a pirate floor (the designer: "time to rework floor 6 entirely … it
// becomes a Pirate themed floor"; the plan, MD/FLOOR6_PIRATE_PLAN.md; the rooms are Claude's). Nine, each round its own
// idea: L the sea (deep water: fall in and you're hurt and back at the door; an enemy knocked in sinks), = a boardwalk
// over it, * a powder keg (it blows up when hit), Y a palm in the sand, b a rock for low cover; set pieces, each a
// rectangle of one letter: Z a beached wreck (its deck a 2.5 m platform; p and P steps up to it), z a small boat up on
// the sand (high cover), M a house, r a rock outcrop, X giant bones (2×2 a skull, bigger an arch of ribs to walk
// under). Sand everywhere else. (The cannons are gone: the designer, "they are far far unmanagable on fast gameplay".) Floor cells always join every door. Drawn
// as quarters like the others (fightRooms.ts). Floor 6 only.
// (Update 0.3.25 — its floor is floorOrder.ts's: the floors were reordered.)
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';
import { FLOOR } from './floorOrder';

const room = (id: string, rows: string[]): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: FLOOR.cove, until: FLOOR.cove });

export const COVE_ROOMS: readonly RoomTemplate[] = [
  // A harbour: the sea in a basin, boardwalks crossing it in a grid (a knock off them is a long way down).
  room('the docks', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..LLLL==LLLLLL',
    '..LLLL==LLLLLL',
    '..LLLL==LLLLLL',
    '..LLLL==LLLLLL',
    '..============',
    '..============',
    '..LLLL==LLLLLL',
    '..LLLL==LLLLLL',
    '..LLLL==LLLLLL',
    '.ELLLL========',
    '..LLLL========',
  ]),
  // Open sand: palms, rocks, outcrops to fight round, rock pools.
  room('the beach', [
    '..............',
    '.E.....T......',
    '..Y.......Y...',
    '..............',
    '....rr....b...',
    '.E..rr........',
    '..........Y...',
    '..Y...........',
    '.......LLL..E.',
    '....b..LLL....',
    '.......LLL....',
    '..Y...........',
    '.E.......Y....',
    '..............',
  ]),
  // A great ship beached in the middle, its deck a platform (steps up at either side), kegs about.
  room('the wreck', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..Y.....*.....',
    '..............',
    '.E...b........',
    '..............',
    '..*.......Y...',
    '..............',
    '.......E......',
    '..........p...',
    '..........P...',
    '..Y....ZZZZZZZ',
    '.......ZZZZZZZ',
  ]),
  // Pirate town: houses either side of the lanes, a keg or two.
  room('pirate town', [
    '..............',
    '.E.....T......',
    '..............',
    '..MMMMMMM.....',
    '..MMMMMMM..E..',
    '..MMMMMMM.....',
    '..............',
    '.E....*.......',
    '..MM......MMMM',
    '..MM......MMMM',
    '..............',
    '..............',
    '.E.......*....',
    '..............',
  ]),
  // A shipyard: small boats up on the sand being worked on, for high cover; kegs and rocks between them.
  room('the shipyard', [
    '..............',
    '.E.....T......',
    '..............',
    '..zzz....zzz..',
    '..zzz....zzz..',
    '.....b....E...',
    '..............',
    '.E..*.........',
    '.......zzz....',
    '..b....zzz..*.',
    '..............',
    '....Y.....b...',
    '.E............',
    '..............',
  ]),
  // The hoard: rock outcrops like a cave's pillars, a giant skull, chests and gold heaped about.
  room('the hoard', [
    '..............',
    '.E.....T......',
    '..rr......rr..',
    '..rr......rr..',
    '..............',
    '.....b....E...',
    '..rr..........',
    '..rr...XX.....',
    '.......XX..b..',
    '.E............',
    '....b.....rr..',
    '..........rr..',
    '..............',
    '..............',
  ]),
  // The powder store: kegs everywhere. One wrong blow and they go up one after another.
  room('the powder store', [
    '..............',
    '.E.....T......',
    '..............',
    '..**..**..**..',
    '..............',
    '..*..b...*..E.',
    '..............',
    '.E..**...b....',
    '..............',
    '..*...*....*..',
    '..............',
    '...b.....**...',
    '.E............',
    '..............',
  ]),
  // Bone reef: arches of giant ribs to run under, a giant skull, rock pools, a palm or two.
  room('bone reef', [
    '..............',
    '.E.....T......',
    '..............',
    '..XXX.....XX..',
    '..XXX.....XX..',
    '..XXX.........',
    '.........E....',
    '..LL....XXX...',
    '..LL....XXX...',
    '.E......XXX...',
    '..............',
    '....Y....LL...',
    '.........LL.E.',
    '..............',
  ]),
  // The kraken's pool: a wide pool of deep sea, a boardwalk round it, kegs on the sand.
  room("the kraken's pool", [
    '..............',
    '.E.....T......',
    '..............',
    '..............',
    '..............',
    '.....=========',
    '.....=LLLLLLLL',
    '.E...=LLLLLLLL',
    '.....=LLLLLLLL',
    '..*..=LLLLLLLL',
    '.....=LLLLLLLL',
    '.....=LLLLLLLL',
    '.....=LLLLLLLL',
    '.....=LLLLLLLL',
  ]),
];

/** Update 0.3.16 — the Big Shark's arena, the Shark's Graveyard (the designer: "the arena isn't appropriate for the Shark
 *  at all, it bumps on pillar … find a new design that would fit an underwater boss arena, maybe weeds or anything sea
 *  related"): open water in the middle, nothing standing in it; cliffs in its corners, arches of giant ribs against its
 *  far walls, small boats sunk against its sides (their blocks hug the walls); seaweed in clumps across the sand (no
 *  blocks), treasure, skulls and cannonballs lying among it (cove.ts). Its doorways' middles kept clear. */
export const SHARK_ROOM: RoomTemplate = {
  id: "the shark's graveyard",
  kind: 'boss',
  rows: quarter([
    '...............',
    '.rrr...........',
    '.rrr.ZZZZZZZ...',
    '.rrr.ZZZZZZZ~..',
    '.....ZZZZZZZ...',
    '..~.........~..',
    '.....~.........',
    'zz.......~.....',
    'zz...~.......~.',
    'zz.............',
    '.XXXX....~.....',
    '.XXXX..~.....~.',
    '.XXXX..........',
    '.E......~......',
    '...............',
  ]),
};

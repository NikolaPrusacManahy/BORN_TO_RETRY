// Update 0.3.17 — floor 8 reworked: the Moon (the designer: "BIG REWORK of FLOOR 8 … Sci-fi / moon theme … Moon themed
// levels"; the plan, MD/FLOOR8_MOON_PLAN.md; the rooms are Claude's). Nine, each round its own idea, on moon dust: c a
// crater (floor: its dish is drawn, a meteorite in the middle of a big one), J a landing pad (in the low gravity it
// throws you onto the roofs), b a moon rock for low cover, p and P raised rock; f a greenhouse bed (alien plants in
// soil) and y an alien tree in it; set pieces, each a rectangle of one letter: O a moon base module (a 4×4 one in the
// middle of the landing site is the lander), d a geodesic dome, u a parked rover, s solar panels, q a boulder. Meteor
// rooms (`meteors`) have meteors falling while they fight (sim/dungeon/meteors.ts). Floor cells always join every
// door. Drawn as quarters like the others (fightRooms.ts). Floor 8 only.
// (Update 0.3.25 — its floor is floorOrder.ts's: the floors were reordered.)
// Update 0.3.29 — its boss room, Tidebreaker's (`MOON_BOSS_ROOM`): pillars for it to tear down.
import type { RoomTemplate } from './rooms';
import { quarter } from './fightRooms';
import { FLOOR } from './floorOrder';

const room = (id: string, rows: string[], meteors = false): RoomTemplate => ({ id, kind: 'fight', rows: quarter(rows), from: FLOOR.moon, until: FLOOR.moon, meteors });

export const MOON_ROOMS: readonly RoomTemplate[] = [
  // The lander in the middle, landing pads round it, a rover parked, crates of rock for cover.
  room('the landing site', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..J......b....',
    '..............',
    '.E...uu.......',
    '.....uu.......',
    '.....uu...J...',
    '..b...........',
    '.........b....',
    '..J...........',
    '.E.......E....',
    '............OO',
    '............OO',
  ]),
  // Craters pressed into the dust, a great one in the middle with its meteorite; meteors still falling.
  room('crater field', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..ccc.....q...',
    '..ccc.........',
    '..ccc...cc....',
    '.E......cc..E.',
    '..............',
    '...q..........',
    '.........ccccc',
    '..cc.....ccccc',
    '..cc.....ccccc',
    '.E.......ccccc',
    '.........ccccc',
  ], true),
  // The base: modules along its lanes, a long one each side, small ones at the corners.
  room('moon base', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..OOOO....OO..',
    '..OOOO....OO..',
    '..............',
    '.E............',
    '..............',
    '..OO....b..OO.',
    '..OO.......OO.',
    '..OO.......OO.',
    '..OO.......OO.',
    '.E.......E....',
    '..............',
  ]),
  // The greenhouse: domes, and beds of soil where the alien plants and trees grow (only here: nothing grows on dust).
  room('the greenhouse', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..dddd...ffff.',
    '..dddd...fyff.',
    '..dddd...ffff.',
    '..dddd........',
    '.E............',
    '.......ffff...',
    '..fff..fyyf...',
    '..fyf..ffff.E.',
    '..fff.........',
    '.E..........dd',
    '............dd',
  ]),
  // Rows of solar panels to weave through.
  room('solar farm', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..ss..ss..ss..',
    '..ss..ss..ss..',
    '..............',
    '.E............',
    '..ss..ss..ss..',
    '..ss..ss..ss..',
    '..............',
    '..ss..ss....E.',
    '..ss..ss......',
    '.E............',
    '..............',
  ]),
  // Rovers parked in bays, a raised loading bay in the middle.
  room('rover depot', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..uu...uu.....',
    '..uu...uu..b..',
    '..uu...uu.....',
    '..............',
    '.E............',
    '..........pppp',
    '..b.......pPPp',
    '..uu......pPPp',
    '..uu......pppp',
    '..uu......E...',
    '.E............',
  ]),
  // High ridges of rock with the radar dishes on them, boulders below; steps up.
  room('radar ridge', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..PPP.....q...',
    '..PPP.........',
    '..ppp....pp...',
    '.E.......pp...',
    '..............',
    '..qq.....PPP..',
    '..qq.....PPP.E',
    '.........ppp..',
    '..............',
    '.E.....b......',
    '..............',
  ]),
  // An open rim: the Earth right over it; boulders and craters; meteors.
  room('earthrise', [
    '..............',
    '.E.....T....E.',
    '..............',
    '..q.......cc..',
    '..........cc..',
    '.....b........',
    '.E............',
    '..............',
    '..cc.....q....',
    '..cc..........',
    '.........ccc..',
    '.E..q....ccc.E',
    '.........ccc..',
    '..............',
  ], true),
  // Open dust, small craters everywhere: meteors falling all the fight.
  room('meteor plain', [
    '..............',
    '.E.....T....E.',
    '..............',
    '...cc......cc.',
    '...cc......cc.',
    '..............',
    '.E.....b......',
    '..............',
    '..b.....cc....',
    '........cc..E.',
    '..............',
    '...cc.........',
    '.E.cc.....cc..',
    '..........cc..',
  ], true),
];

/** Update 0.3.29 — Tidebreaker's arena (the designer: "full destructions, maybe they can grab a pillar"): twelve stone
 *  pillars in two rings (four round its middle, eight further out) for it to tear out, roll through and quake down;
 *  moon rock and high cover to get behind, landing pads to get over its rings; its middle (where it rises) and its
 *  doorways' middles kept clear. */
export const MOON_BOSS_ROOM: RoomTemplate = {
  id: 'the shattered crater',
  kind: 'boss',
  rows: quarter([
    '...............',
    '..........E....',
    '...............',
    '...........C...',
    '...............',
    '..b.........B..',
    '...............',
    '...............',
    '.E.............',
    '...J......C..J.',
    '...............',
    '...C...........',
    '..B............',
    '...............',
    '...............',
  ]),
};

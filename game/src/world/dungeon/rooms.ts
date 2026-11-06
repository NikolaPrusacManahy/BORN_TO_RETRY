// Update 0.0.12 — the dungeon's hand-made rooms (the designer: at least 8, with variations), drawn from above on the
// 2 m grid the kit is built for. Only the inside is drawn: the walls round it, and an arched door in the middle of
// any side a corridor reaches, are added when the floor is laid out (floorPlan.ts). North (the top row) is −z.
//   .  floor           #  wall (6 m)        C  column (5 m)       b  low cover (crates, 1.3 m)
//   B  high cover (2.9 m)  p  ledge (1 m)   P  high ledge (2.5 m) ^  spikes        J  jump pad
//   ?  low cover or floor, chosen per run   E  where enemies may appear (floor)
//   T  where a chest may stand (floor)      S  a shop's display tile (floor)
// The middle two cells of every side are kept clear two deep for the doors. Variations per run: mirrored either way,
// turned a quarter (square rooms), and every ? decided.
// Update 0.0.13 — the fight rooms are twice the size (fightRooms.ts); chests (T) and the shop room.
// Update 0.0.15 — the boss room replaces the exit room (and its trapdoor): the way down is now a wooden gate in its far
// wall, onto the dark (floorPlan.ts stamps the gate and the dark beyond it).
// Update 0.0.20 — L: a lava pit (the lava rooms, retired in Update 0.2.24); a template may wait for a floor (`from`).
// Update 0.0.21 — U: a perch (a high ledge where a spitter stands: keepRooms.ts); a template may stop at a floor
// (`until`).
// Update 0.2.4 — floor 4's desert (desertRooms.ts): Q quicksand (floor you sink in), Y a palm and K a cactus, each in a
// bed of sand.
// Update 0.2.10 — floor 5's Drowned Temple (drownedRooms.ts): W a willow in a bed of mud (and no pits).
// Update 0.2.11 — floor 6's Sunken Grove (sunkenRooms.ts): D a drowned tree in a bed of silt, ~ seaweed in a bed of
// silt (floor).
// Update 0.2.23 — floor 2's Venom Garden (venomRooms.ts): , a bed of earth (flowers, short grass, plants), G a bed of
// tall grass (it parts round what walks through it), R a tree in a bed of earth, w a web on the floor (it slows you), h
// a wasps' hive on the wall beside this cell (floor). Its boss room is its own (Update 0.3.52: The Swarm's nest, nest.ts).
// Update 0.2.24 — floor 3's Bone Keep (boneRooms.ts): g an open grave (Skeletons climb out), m a bed of glowing
// mushrooms (Mushnubs come out), o a burrow (White Rabbits pop out), x a crystal cluster (a block; Skull Wraiths blink
// to them). Its boss room is its own (Update 0.3.53: the Bone King's pit, pit.ts). The lava rooms are retired.
// Update 0.3.11 — floor 7's Frozen Depths (frozenRooms.ts): I a sheet of ice (floor you slide on), F a snowy tree in a
// bed of snow, n a bed of snow (floor).
// Update 0.3.13 — floor 8's Forge (forgeRooms.ts): H a crusher (its hammer slams the cell on a beat; cells side by side
// are one press), V a fire vent (a grate that jets fire on a timer), > < v A a belt running east, west, south, north
// (it carries what stands on it; turned and mirrored with the room), k a workbench (a block); L lava pits again.
// Update 0.3.14 — floor 6 reworked, Skull Cove (coveRooms.ts; the Sunken Grove's rooms retired): L the sea (deep water),
// = a boardwalk over it (floor), * a powder keg (it blows up when hit), and rectangles drawn of one letter, each one set
// piece: Z a beached wreck (its deck a 2.5 m platform), z a small boat up on the sand, M a house, r a rock outcrop, X
// giant bones (a skull, or an arch of ribs you walk under).
// Update 0.3.17 — floor 8 reworked, the Moon (moonRooms.ts; the Forge's rooms retired from it): c a crater (floor, its
// dish drawn), f a greenhouse bed (alien plants in soil), y an alien tree in it (its trunk a block), and set pieces drawn
// as rectangles of one letter: O a moon base module, d a geodesic dome, u a parked rover, s solar panels, q a boulder.
// Update 0.3.32 — floor 8, the Shrine Dimension (shrineRooms.ts): a a sakura, e a maple, j a pine (each in a bed of
// earth), + a bed of moss, i bamboo, l a stone lantern, % a small shrine, ! a training dummy, | a weapon rack, N raked
// gravel, : a dojo's planks; L its ponds and = its bridges; set pieces drawn as rectangles of one letter: t a torii,
// @ the shrine hall, $ a pagoda, & a bell tower.
// Update 0.3.58 — the Drowned King's temple (temple.ts): _ a low stone (0.6 m: just over its first water, under its second).
import type { Rng } from '../../core/rng';
import { FIGHT_ROOMS as FIRST_ROOMS, quarter } from './fightRooms';
import { KEEP_ROOMS } from './keepRooms';
import { DESERT_ROOMS } from './desertRooms';
import { DROWNED_ROOMS } from './drownedRooms';
import { VENOM_ROOMS } from './venomRooms';
import { BONE_ROOMS } from './boneRooms';
import { PIT_ROOM } from './pit';
import { PLATEAU_ROOM } from './plateau';
import { TEMPLE_ROOM } from './temple';
import { RUINS_ROOM } from './ruins';
import { FROZEN_ROOMS } from './frozenRooms';
import { FORGE_ROOMS } from './forgeRooms';
import { COVE_ROOMS, SHARK_ROOM } from './coveRooms';
import { MOON_BOSS_ROOM, MOON_ROOMS } from './moonRooms';
import { COURTYARD_ROOM } from './courtyard';
import { NEST_ROOM } from './nest';
import { SHRINE_BOSS_ROOM, SHRINE_ROOMS } from './shrineRooms';
import { realmOf } from './floorOrder';

/** Every fight room (Update 0.0.20: the lava rooms too, from their floor on; Update 0.0.21: floor 3's). */
export const FIGHT_ROOMS: readonly RoomTemplate[] = [...FIRST_ROOMS, ...VENOM_ROOMS, ...BONE_ROOMS, ...KEEP_ROOMS, ...DESERT_ROOMS, ...DROWNED_ROOMS, ...COVE_ROOMS, ...FROZEN_ROOMS, ...FORGE_ROOMS, ...MOON_ROOMS, ...SHRINE_ROOMS];

/** Update 0.0.21 — the rooms floor `floor` has. */
export const onFloor = (t: RoomTemplate, floor: number) => (t.from ?? 1) <= floor && floor <= (t.until ?? Infinity);

export type Cell = 'void' | 'floor' | 'wall' | 'column' | 'low' | 'high' | 'ledge' | 'highLedge' | 'stone' | 'spikes' | 'pad' | 'door' | 'dark' | 'tile' | 'chest' | 'lava' | 'sand' | 'palm' | 'cactus' | 'willow' | 'snag' | 'weed' | 'bed' | 'grass' | 'tree' | 'web' | 'grave' | 'shroom' | 'burrow' | 'crystal' | 'ice' | 'pine' | 'snow' | 'crusher' | 'vent' | 'belt' | 'bench' | 'boardwalk' | 'keg' | 'wreck' | 'boat' | 'house' | 'outcrop' | 'bones' | 'crater' | 'flora' | 'alienTree' | 'module' | 'dome' | 'rover' | 'solar' | 'boulder' | 'sakura' | 'maple' | 'jpine' | 'bamboo' | 'lantern' | 'torii' | 'gravel' | 'dojo' | 'hall' | 'pagoda' | 'bell' | 'hokora' | 'moss' | 'dummy' | 'rack';
export type RoomKind = 'start' | 'fight' | 'boss' | 'shop';

export interface RoomTemplate {
  id: string;
  kind: RoomKind;
  rows: string[];
  /** Update 0.0.20 — the first floor it comes on (1 when not given). Update 0.0.21 — and the last. */
  from?: number;
  until?: number;
  /** Update 0.2.11 — only ever its floors' challenge room (never on the way): floor 6's drowned heart. */
  challenge?: boolean;
  /** Update 0.3.17 — meteors fall in it while it fights (floor 8's: sim/dungeon/meteors.ts). */
  meteors?: boolean;
}

const CHAR: Record<string, Cell> = {
  '.': 'floor',
  '#': 'wall',
  C: 'column',
  b: 'low',
  B: 'high',
  p: 'ledge',
  _: 'stone',
  P: 'highLedge',
  '^': 'spikes',
  J: 'pad',
  E: 'floor',
  '?': 'floor',
  T: 'floor',
  S: 'tile',
  L: 'lava',
  U: 'highLedge',
  Q: 'sand',
  Y: 'palm',
  K: 'cactus',
  W: 'willow',
  D: 'snag',
  '~': 'weed',
  ',': 'bed',
  G: 'grass',
  R: 'tree',
  w: 'web',
  h: 'floor',
  g: 'grave',
  m: 'shroom',
  o: 'burrow',
  x: 'crystal',
  I: 'ice',
  F: 'pine',
  n: 'snow',
  H: 'crusher',
  V: 'vent',
  '>': 'belt',
  '<': 'belt',
  v: 'belt',
  A: 'belt',
  k: 'bench',
  '=': 'boardwalk',
  '*': 'keg',
  Z: 'wreck',
  z: 'boat',
  M: 'house',
  r: 'outcrop',
  X: 'bones',
  c: 'crater',
  f: 'flora',
  y: 'alienTree',
  O: 'module',
  d: 'dome',
  u: 'rover',
  s: 'solar',
  q: 'boulder',
  a: 'sakura',
  e: 'maple',
  j: 'jpine',
  i: 'bamboo',
  l: 'lantern',
  t: 'torii',
  N: 'gravel',
  ':': 'dojo',
  '@': 'hall',
  $: 'pagoda',
  '&': 'bell',
  '%': 'hokora',
  '+': 'moss',
  '!': 'dummy',
  '|': 'rack',
};

/** Update 0.3.13 — a belt's way (dx, dz on the grid: +z is south). */
export const BELT_WAY: Record<string, [number, number]> = { '>': [1, 0], '<': [-1, 0], v: [0, 1], A: [0, -1] };

export const START_ROOM: RoomTemplate = {
  id: 'start',
  kind: 'start',
  rows: ['............', '............', '..b......b..', '............', '............', '............', '............', '............', '............', '..b......b..', '............', '............'],
};

/** Update 0.0.15 — the boss room (the designer: the walls slide back as the boss arrives): 60 m square, open in the
 *  middle (the portal), four columns and eight broken ones to run its charge into, a pad in each corner, and spots by
 *  the walls for the grunts it calls. Drawn as its top-left quarter. */
export const BOSS_ROOM: RoomTemplate = {
  id: 'boss',
  kind: 'boss',
  rows: quarter([
    '...............',
    '...............',
    '.........E.....',
    '...J...........',
    '...............',
    '............B..',
    '...............',
    '...............',
    '........C......',
    '..E............',
    '...............',
    '...............',
    '.....B.........',
    '...............',
    '...............',
  ]),
};

/** Update 0.2.23 — floor `floor`'s boss room: floor 2's its own, floor 3's its own,
 *  floor 6's the Shark's Graveyard (coveRooms.ts, Update 0.3.16), the rest the one above.
 *  (Update 0.3.25 — by its place, floorOrder.ts: the Venom Garden's, the Bone Keep's, Skull Cove's.) Update 0.3.29 — the
 *  Moon's, Tidebreaker's shattered crater (moonRooms.ts). Update 0.3.32 — the Shrine Dimension's Great Shrine. */
export const bossRoomOf = (floor: number): RoomTemplate => {
  const r = realmOf(floor);
  // (Update 0.3.50 — the Dungeon's, the Dragon's courtyard: courtyard.ts.)
  if (r === 'dungeon') return COURTYARD_ROOM;
  // (Update 0.3.52 — the Venom Garden's, The Swarm's nest: nest.ts.)
  // (Update 0.3.53 — the Bone Keep's, the Bone King's pit: pit.ts.)
  // (Update 0.3.56 — Frozen Depths', the Frost Roc's plateau: plateau.ts.)
  // (Update 0.3.58 — the Drowned Temple's, the Drowned King's flooded temple: temple.ts.)
  // (Update 0.3.60 — the Desert's, the Velociraptor's ruins: ruins.ts.)
  return r === 'garden' ? NEST_ROOM : r === 'keep' ? PIT_ROOM : r === 'frozen' ? PLATEAU_ROOM : r === 'temple' ? TEMPLE_ROOM : r === 'desert' ? RUINS_ROOM : r === 'cove' ? SHARK_ROOM : r === 'moon' ? MOON_BOSS_ROOM : r === 'shrine' ? SHRINE_BOSS_ROOM : BOSS_ROOM;
};

/** Update 0.0.13 — the shop (the designer: a room with five floor tiles, each showing something to buy). */
export const SHOP_ROOM: RoomTemplate = {
  id: 'shop',
  kind: 'shop',
  rows: [
    '................',
    '................',
    '..C..........C..',
    '................',
    '...S.S.S.S.S....',
    '................',
    '................',
    '................',
    '................',
    '..C..........C..',
    '................',
    '................',
  ],
};

/** A room as laid out for one run: its cells (row-major, w × h), where enemies may appear, and how it was varied. */
export interface RoomLayout {
  template: RoomTemplate;
  w: number;
  h: number;
  cells: Cell[];
  /** Cells (col, row) inside the room where enemies may appear. */
  spawns: [number, number][];
  /** Update 0.0.13 — where a chest may stand, and the shop's display tiles (in reading order). */
  chestSpots: [number, number][];
  tiles: [number, number][];
  /** Update 0.0.21 — perches (on high ledges): where spitters stand. */
  perches: [number, number][];
  /** Update 0.2.23 — cells beside a wall with a wasps' hive on it. */
  hives: [number, number][];
  /** Update 0.3.13 — belts: (col, row) and the way each runs (dx, dz), turned and mirrored with the room. */
  belts: [number, number, number, number][];
}

/** Where (col, row) of the varied room comes from in the template (turned and mirrored). */
function sourceAt(t: RoomTemplate, col: number, row: number, turn: boolean, flipX: boolean, flipZ: boolean): [number, number] {
  const w = turn ? t.rows.length : t.rows[0].length;
  const h = turn ? t.rows[0].length : t.rows.length;
  let c = flipX ? w - 1 - col : col;
  let r = flipZ ? h - 1 - row : row;
  if (turn) [c, r] = [r, w - 1 - c];
  return [c, r];
}

/** The template's characters, turned and mirrored: what's at (col, row) of the varied room. */
function sourceChar(t: RoomTemplate, col: number, row: number, turn: boolean, flipX: boolean, flipZ: boolean): string {
  const [c, r] = sourceAt(t, col, row, turn, flipX, flipZ);
  return t.rows[r][c];
}

/** Update 0.3.13 — the way a belt drawn running `way` runs in the varied room: the step in it that's that step in the
 *  template. */
function variedWay(t: RoomTemplate, way: [number, number], turn: boolean, flipX: boolean, flipZ: boolean): [number, number] {
  const [c0, r0] = sourceAt(t, 0, 0, turn, flipX, flipZ);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const [c, r] = sourceAt(t, dx, dz, turn, flipX, flipZ);
    if (c - c0 === way[0] && r - r0 === way[1]) return [dx, dz];
  }
  return way;
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
  const chestSpots: [number, number][] = [];
  const tiles: [number, number][] = [];
  const perches: [number, number][] = [];
  const hives: [number, number][] = [];
  const belts: [number, number, number, number][] = [];
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const ch = sourceChar(t, col, row, turn, flipX, flipZ);
      if (ch === 'E') spawns.push([col, row]);
      if (ch === 'T') chestSpots.push([col, row]);
      if (ch === 'S') tiles.push([col, row]);
      if (ch === 'U') perches.push([col, row]);
      if (ch === 'h') hives.push([col, row]);
      if (BELT_WAY[ch]) belts.push([col, row, ...variedWay(t, BELT_WAY[ch], turn, flipX, flipZ)]);
      cells.push(ch === '?' ? (rng() < 0.5 ? 'low' : 'floor') : CHAR[ch] ?? 'floor');
    }
  }
  return { template: t, w, h, cells, spawns, chestSpots, tiles, perches, hives, belts };
}

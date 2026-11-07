// Update 0.3.21 — the manor's galleries (the designer: "for room on the left downstairs that display all weapon align
// them all properly and put their name and effect as player get closer, like a gallery of all items, that is the left
// side; the right side downstair is objects that aren't weapons, ring, health, armour; upstairs right is the Cards
// gallery"): where each exhibit stands. The weapons on pedestals in the west wing's south room, in rows (the silver ones,
// the gold ones under them, then the axe and the book); the other things on pedestals in the east wing's south
// room, a row of each sort (health and armour, the rings, the keys, the kill bonuses); every card on the walls of the
// east wing's upper room, round it from its door (the Fate Cards from common to mythic, then the Traitor Cards, then the
// Death Cards). Coming near one shows its name and what it does (sim/lobby/lobby.ts). Pure.
import { CARD, CARD_KINDS, CardKind, familyOf } from '../../sim/cards/cards';
import type { InfoKind } from '../../sim/items/itemInfo';
import { WALL_DEPTH, WING } from './spots';

/** A pedestal's exhibit: what, and where (its pedestal's middle). */
export interface Stand {
  kind: InfoKind;
  x: number;
  z: number;
}

/** A card on a wall: which, its middle (m), its turn (its face's way; 0 faces south). */
export interface CardSlot {
  kind: CardKind;
  x: number;
  y: number;
  z: number;
  rot: number;
}

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const NORTH = Math.PI;
const IN = WALL_DEPTH / 2;

/** The weapons, row by row from the hall's arch: the silver ones, the gold ones, the rest. */
const WEAPON_ROWS: readonly (readonly InfoKind[])[] = [
  ['sword', 'daggers', 'hammer'],
  ['goldSword', 'goldDaggers', 'goldHammer'],
  ['goldAxe', 'grimoire'],
];
/** The other things, a row of each sort. */
const ITEM_ROWS: readonly (readonly InfoKind[])[] = [
  ['heart', 'greatHeart', 'plate', 'goldPlate'],
  ['redRing', 'blueRing', 'greenRing', 'tealRing'],
  ['key', 'whiteKey', 'goldKey'],
  ['snowflake', 'goldIngots', 'bluePotion'],
];

/** Rows of exhibits from the hall's side wall out (`side` −1 west, 1 east): rows at `zs`, each centred on `cols`. */
function rows(list: readonly (readonly InfoKind[])[], side: number, zs: readonly number[], step: number, x0: number): Stand[] {
  const out: Stand[] = [];
  const widest = Math.max(...list.map((r) => r.length));
  list.forEach((row, i) => {
    const shift = ((widest - row.length) * step) / 2;
    row.forEach((kind, j) => out.push({ kind, x: side * (x0 + shift + j * step), z: zs[i] }));
  });
  return out;
}

/** The weapons gallery's pedestals (the west wing's south room). */
export const WEAPON_STANDS: readonly Stand[] = rows(WEAPON_ROWS, -1, [-1, 3.5, 8], 4.5, 20);
/** The items gallery's pedestals (the east wing's south room). */
export const ITEM_STANDS: readonly Stand[] = rows(ITEM_ROWS, 1, [-1.5, 1.8, 5.1, 8.4], 3.5, 19.5);

/** The order the cards hang in: the Fate Cards by rarity, then the Traitor Cards, then the Death Cards. */
const RANK = ['common', 'uncommon', 'rare', 'epic', 'mythic'];
const FAMILY = ['fate', 'traitor', 'death'];
export const CARD_ORDER: readonly CardKind[] = [...CARD_KINDS].sort((a, b) => FAMILY.indexOf(familyOf(a)) - FAMILY.indexOf(familyOf(b)) || RANK.indexOf(CARD[a].rarity) - RANK.indexOf(CARD[b].rarity));

/** A card's size on the wall (m), its middle's height over the floor, and the step between them. */
export const CARD_SIZE = { w: 0.8, h: 1.15, y: 1.7, step: 1.25 } as const;

/** Every card on the cards gallery's walls, clockwise round the room from its door (in its north-west corner): the north
 *  wall, the outer wall, the south wall, back up the hall's side. */
export function cardSlots(): CardSlot[] {
  const { x0, x1, z0, z1, upper } = WING;
  const y = upper + CARD_SIZE.y;
  const s = CARD_SIZE.step;
  const spots: Omit<CardSlot, 'kind'>[] = [];
  for (let x = x0 + 3; x <= x1 - 1.2; x += s) spots.push({ x, y, z: z0 + IN + 0.05, rot: 0 });
  for (let z = z0 + 2; z <= z1 - 1.2; z += s) spots.push({ x: x1 - IN - 0.05, y, z, rot: WEST });
  for (let x = x1 - 1.5; x >= x0 + 2.5; x -= s) spots.push({ x, y, z: z1 - IN - 0.05, rot: NORTH });
  for (let z = z1 - 1.5; z >= z0 + 4; z -= s) spots.push({ x: x0 + IN + 0.05, y, z, rot: EAST });
  return CARD_ORDER.map((kind, i) => ({ kind, ...spots[i] }));
}

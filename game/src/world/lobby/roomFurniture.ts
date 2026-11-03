// Update 0.3.21 — the manor's rooms behind the galleries (MD/LOBBY_MANOR_PLAN.md), each furnished for what it is: the
// dining hall (west: the long table laid for a feast on its rug, chairs down both sides and at its head, the hearth by
// the north wall with two chairs to it, barrels in the corner) and the library (east: a lectern by the door, two reading
// tables of open books, scrolls and candles on a rug, stacks of books along the walls, the alchemist's table of potions,
// tall candelabra). Each pushes into `put` (furniture.ts keeps them). Pure data.
import type { Prop } from './furniture';
import { WALL_DEPTH, WING } from './spots';

type Put = (piece: string, x: number, y: number, z: number, rot?: number, s?: number | [number, number, number], solid?: [number, number, number]) => void;

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const NORTH = Math.PI;
/** A table's top (m). */
const TOP = 0.85;
/** A room's wall faces are this far in from its walls' middle lines. */
const IN = WALL_DEPTH / 2;
const CHAIR: [number, number, number] = [0.6, 1.1, 0.6];

/** The dining hall's fire (its middle on the floor), by the north wall between its windows. */
export const HEARTH = { x: -24, y: 0, z: -20.3 } as const;

export function roomFurniture(put: Put): void {
  const W = -WING.x1 + IN;
  const E = WING.x1 - IN;

  // The dining hall: the long table across the room (three end to end), chairs down both sides and at its head, the
  // feast on it, its rug; the hearth by the north wall, two chairs to it; barrels in the corner by the hall.
  put('kit_p2_Carpet', -24, 0.005, -14.6, EAST, [1.7, 0.15, 2.05]);
  [-27.3, -24, -20.7].forEach((x, i) => {
    put('lobby_p1_Table_Big', x, 0, -14.6, EAST, 1, [1.6, TOP, 3.3]);
    for (const dx of [-0.8, 0.8]) {
      put('lobby_p1_Chair', x + dx, 0, -15.8, NORTH + ((i + dx) % 2) * 0.06, 1, CHAIR);
      put('lobby_p1_Chair', x + dx, 0, -13.4, (i % 2) * 0.08, 1, CHAIR);
    }
    put('lobby_p2_Candelabrum', x, TOP, -14.6, EAST, 0.55);
    put('lobby_r_Chalice', x - 0.9, TOP, -14.18, 0, 0.3);
    put('lobby_r_Chalice', x + 0.7, TOP, -15.05, 0, 0.3);
    put('lobby_r_ChickenLeg', x - 0.5, TOP, -14.95, 0.6 + i, 0.3);
    put('lobby_p1_Coin_Pile', x + 1.05, TOP, -14.2, i, 2.2);
  });
  put('lobby_p1_Chair', -29.6, 0, -14.6, EAST, 1.1, CHAIR);
  put('kit_p1_Woodfire', HEARTH.x, 0, HEARTH.z, 0, 1.6, [1.2, 1.2, 1.2]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    put(i % 2 ? 'kit_p2_Rock1' : 'kit_p2_Rock3', HEARTH.x + Math.cos(a) * 1.05, 0, HEARTH.z + Math.sin(a) * 1.05, a * 2, 0.28);
  }
  put('lobby_p1_Chair', HEARTH.x - 1.3, 0, HEARTH.z + 1.9, NORTH + 0.5, 1, CHAIR);
  put('lobby_p1_Chair', HEARTH.x + 1.3, 0, HEARTH.z + 1.9, NORTH - 0.4, 1, CHAIR);
  put('kit_p1_Barrel', -16.4, 0, -20.6, 0, 1, [1, 1.35, 1]);
  put('kit_p1_Barrel2', -16.5, 0, -19.2, 0.5, 1, [1, 1.35, 1]);
  put('kit_p1_Chest', W + 0.6, 0, -9.4, EAST, 1, [1.2, 0.9, 0.85]);

  // The library: a lectern by the door from the items gallery, two reading tables on a rug (books open, scrolls,
  // parchment, candles), stacks of books along the walls, the alchemist's table of potions, tall candelabra.
  put('lobby_p1_Pedestal2', 24, 0, -10.2, NORTH, [0.5, 0.5, 0.5], [0.87, 1.16, 0.87]);
  put('lobby_p2_Book_Open', 24, 1.16, -10.2, NORTH, 0.32);
  put('kit_p2_Carpet', 24, 0.005, -16.1, EAST, [1.6, 0.15, 1.7]);
  for (const x of [21, 27]) {
    put('lobby_p1_Table_Big', x, 0, -16.1, EAST, 1, [1.6, TOP, 3.3]);
    for (const dx of [-0.85, 0.85]) {
      put('lobby_p1_Chair', x + dx, 0, -17.25, 0, 1, CHAIR);
      put('lobby_p1_Chair', x + dx, 0, -14.95, NORTH, 1, CHAIR);
    }
    put('lobby_r_Book1_Open', x - 0.7, TOP, -16.1, 0.2, 0.42);
    put('lobby_p2_Book_Open', x + 0.8, TOP, -15.9, -0.3, 0.3);
    put('lobby_r_Scroll', x + 0.1, TOP, -16.55, 0.4, 0.3);
    put('lobby_p2_Candle', x + 1.4, TOP, -16.4, 0, 0.45);
    put('lobby_r_Parchment', x - 1.3, TOP, -15.75, 1.2, 0.3);
  }
  const stack = (x: number, z: number, n: number) => {
    const books = ['lobby_r_Book1_Closed', 'lobby_r_Book2_Closed', 'lobby_r_Book3_Closed', 'lobby_r_Book4_Closed'];
    for (let k = 0; k < n; k++) put(books[(k + Math.round(x)) % 4], x, k * 0.105, z, EAST + (k % 3) * 0.2 - 0.2, [0.35, 0.35, 0.35]);
  };
  for (const [x, z, n] of [[E - 0.5, -20.8, 5], [E - 0.5, -19.9, 3], [E - 0.5, -9.4, 4], [16.2, -20.9, 4], [17.1, -20.9, 6], [31.2, -20.9, 3]] as const) stack(x, z, n);
  put('lobby_p1_Table_Small', E - 0.8, 0, -13.2, 0, 1, [1.3, TOP, 2]);
  const potions = ['lobby_p2_Potion2', 'lobby_r_Potion1_Filled', 'lobby_p2_Potion5', 'lobby_r_Potion4_Filled', 'lobby_p2_Potion6', 'lobby_r_Potion6_Filled'];
  potions.forEach((piece, i) => put(piece, E - 1.05 + (i % 2) * 0.5, TOP, -13.9 + Math.floor(i / 2) * 0.6, i * 0.7, 0.32));
  put('kit_p2_Candelabrum_tall', 16.4, 0, -10, 0, 1.15, [0.7, 2.1, 0.7]);
  put('kit_p2_Candelabrum_tall', E - 0.6, 0, -9.6, 0, 1.15, [0.7, 2.1, 0.7]);
  put('lobby_p1_Banner', 16.6, 0, -20.2, WEST, 1.05, [0.4, 4, 0.4]);
}

export type { Prop };

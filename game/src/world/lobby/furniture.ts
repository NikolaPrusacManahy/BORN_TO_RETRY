// Update 0.2.9 — what stands on the lobby's floor (spots.ts): every piece, where, turned and scaled, and the solid box
// the bigger ones stand in (the hall's collision is built from the same list, so you bump into what you see). Pieces
// are the dungeon kit's (kit_…, public/models/dungeon/kit.glb) and the lobby's own (lobby_…, public/models/menu/
// lobby.glb: tools/blender/build_lobby_kit.py). Some of the packs' small things come huge (a book 1.2 m across): they're
// scaled to life here. Pure data.
import { ALTAR_H, ALTARS } from './spots';

export interface Prop {
  piece: string;
  x: number;
  y: number;
  z: number;
  /** Turn about y (rad): 0 faces south (+z), π/2 east. */
  rot: number;
  s: [number, number, number];
  /** Its solid box (width across x, height, depth along z, before turning), standing at y; none: small, walked past. */
  solid?: [number, number, number];
}

const list: Prop[] = [];
const put = (piece: string, x: number, y: number, z: number, rot = 0, s = 1, solid?: [number, number, number]) =>
  list.push({ piece, x, y, z, rot, s: [s, s, s], solid });
const putS = (piece: string, x: number, y: number, z: number, rot: number, s: [number, number, number], solid?: [number, number, number]) =>
  list.push({ piece, x, y, z, rot, s, solid });

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const NORTH = Math.PI;
/** A table's top (m). */
const TOP = 0.85;

// The gate's guard: two rearing horses, two tall candelabra, a standing banner in each corner by it.
for (const k of [-1, 1]) {
  put('lobby_p1_Statue_Horse', k * 8.6, 0, -19, 0, 1, [1.8, 5.9, 3.4]);
  put('kit_p2_Candelabrum_tall', k * 4, 0, -20.6, 0, 1.25, [0.7, 2.3, 0.7]);
  put('lobby_p1_Banner', k * 12.2, 0, -21.3, 0, 1.25, [0.4, 4.7, 0.4]);
}

// Standing banners lining the carpet up to the gate.
for (const k of [-1, 1]) for (const z of [-16, -9.5, -3]) put('lobby_p1_Banner', k * 2.7, 0, z, 0, 1.1, [0.4, 4.2, 0.4]);

// The difficulties: an altar each, its sign over it on the wall (hallDressing.ts), and what it stands for on it.
const SIGNS = ['lobby_r_Heart', 'lobby_r_Sword_big', 'lobby_r_Skull2'];
const SIGN_SCALE = [0.55, 0.55, 0.55];
ALTARS.forEach((a, i) => {
  putS('lobby_p1_Pedestal2', a.x, 0, a.z, EAST, [0.62, 0.5, 0.62], [1.1, ALTAR_H, 1.1]);
  put(SIGNS[i], a.x, ALTAR_H, a.z, EAST, SIGN_SCALE[i]);
});

// Dark columns up to the roof's beams, framing the two side areas.
for (const x of [-12, 12]) for (const z of [-14, 10]) putS('kit_p1_Column', x, 0, z, 0, [1.3, 2.415, 1.3], [1.7, 9.8, 1.7]);

// Two feast tables either side of the carpet, three long tables end to end, chairs down both sides and at the head.
const SEATS = [2.6, 5.9, 9.2];
for (const k of [-1, 1]) {
  const x = k * 6.2;
  SEATS.forEach((z, i) => {
    put('lobby_p1_Table_Big', x, 0, z, 0, 1, [1.6, TOP, 3.3]);
    for (const dz of [-0.8, 0.8]) {
      // A little out of line, as people left them; one on each table pushed back.
      const back = i === 1 && dz > 0 ? 0.35 : 0;
      put('lobby_p1_Chair', x - 1.2 - back, 0, z + dz, EAST + ((i * 3 + dz * 5) % 2) * 0.08, 1, [0.6, 1.1, 0.6]);
      put('lobby_p1_Chair', x + 1.2, 0, z + dz, WEST - ((i + 1) % 2) * 0.1, 1, [0.6, 1.1, 0.6]);
    }
    // The feast: a candelabrum in the middle, cups, meat, coins; a book on the last.
    put('lobby_p2_Candelabrum', x, TOP, z, 0, 0.55);
    put('lobby_r_Chalice', x - 0.42, TOP, z - 0.9, 0, 0.3);
    put('lobby_r_Chalice', x + 0.45, TOP, z + 0.7, 0, 0.3);
    put('lobby_r_ChickenLeg', x + 0.35, TOP, z - 0.55, 0.6 + i, 0.3);
    put('lobby_p1_Coin_Pile', x - 0.4, TOP, z + 0.95, i, 2.2);
    if (i === 2) put('lobby_p2_Book_Open', x - 0.2, TOP, z + 1.2, 0.3, 0.3);
  });
  put('lobby_p1_Chair', x, 0, 0.2, 0, 1.08, [0.6, 1.1, 0.6]);
}

// The credits: a tall candelabrum either side of the boards.
for (const k of [-1, 1]) put('kit_p2_Candelabrum_tall', k * 8.3, 0, 21, 0, 1.25, [0.7, 2.3, 0.7]);

// North-west corner: stores. Crates (one on another), barrels, a bucket.
put('kit_p1_Crate', -13.6, 0, -20.5, 0, 1, [1.4, 1.31, 1.4]);
put('kit_p1_Crate', -13.6, 1.31, -20.5, 0.4, 0.8);
put('kit_p1_Crate', -10.4, 0, -20.8, 0.2, 1, [1.4, 1.31, 1.4]);
put('kit_p1_Barrel', -13.9, 0, -18.2, 0, 1, [1, 1.35, 1]);
put('kit_p1_Barrel2', -12.7, 0, -17.6, 0.7, 1, [1, 1.35, 1]);
put('kit_p1_Bucket', -11.4, 0, -18.9, 0.5);

// North-east corner: the treasure. A gold chest spilling coins, bags of coin, barrels.
put('lobby_p1_Chest_Gold', 13.4, 0, -20.4, WEST, 1, [1.6, 0.9, 1.2]);
for (const [x, z, r] of [[12.2, -20.6, 0], [12.5, -19.5, 1], [13.2, -18.9, 2], [11.9, -19.9, 3]]) put('lobby_p1_Coin_Pile', x, 0, z, r, 3);
put('lobby_p1_Bag_Coins', 12.1, 0, -18.8, 0.4, 2);
put('lobby_p1_Bag_Standing', 14.1, 0, -18.7, 0, 2.5);
put('kit_p1_Barrel2', 14, 0, -16.9, 0, 1, [1, 1.35, 1]);

// South-west corner: a reading table with books and a candle.
put('lobby_p1_Table_Small', -12.4, 0, 18, 0, 1, [1.3, TOP, 2]);
put('lobby_p1_Chair', -13.6, 0, 18.3, EAST, 1, [0.6, 1.1, 0.6]);
put('lobby_p1_Chair', -11.2, 0, 17.4, WEST + 0.3, 1, [0.6, 1.1, 0.6]);
put('lobby_p2_Book_Open', -12.5, TOP, 17.6, 0.2, 0.3);
put('lobby_p2_Book3', -12.2, TOP, 18.6, NORTH + 0.4, 0.28);
put('lobby_r_Book1_Closed', -12.7, TOP, 18.8, 0.9, 0.35);
put('lobby_r_Scroll', -12.1, TOP, 17.1, 1.2, 0.3);
put('lobby_p2_Candle', -12.75, TOP, 17.2, 0, 0.45);
put('kit_p1_Chest', -14, 0, 20.8, 0, 1, [1, 0.9, 0.8]);

// South-east corner: the hearth, ringed with stones, two chairs to it, barrels by the wall.
put('kit_p1_Woodfire', 11.8, 0, 17.6, 0, 1.6, [1.2, 1.2, 1.2]);
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2;
  put(i % 2 ? 'kit_p2_Rock1' : 'kit_p2_Rock3', 11.8 + Math.cos(a) * 1.05, 0, 17.6 + Math.sin(a) * 1.05, a * 2, 0.28);
}
put('lobby_p1_Chair', 9.6, 0, 17, EAST - 0.4, 1, [0.6, 1.1, 0.6]);
put('lobby_p1_Chair', 11.4, 0, 20, NORTH + 0.2, 1, [0.6, 1.1, 0.6]);
put('kit_p1_Barrel', 14, 0, 20.8, 0, 1, [1, 1.35, 1]);
put('kit_p1_Barrel2', 14.1, 0, 19.4, 0.5, 1, [1, 1.35, 1]);

export const FURNITURE: readonly Prop[] = list;

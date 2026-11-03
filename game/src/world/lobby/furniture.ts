// Update 0.2.9 — what stands on the lobby's floor (spots.ts): every piece, where, turned and scaled, and the solid box
// the bigger ones stand in (the hall's collision is built from the same list, so you bump into what you see). Pieces
// are the dungeon kit's (kit_…, public/models/dungeon/kit.glb) and the lobby's own (lobby_…, public/models/menu/
// lobby.glb: tools/blender/build_lobby_kit.py). Some of the packs' small things come huge (a book 1.2 m across): they're
// scaled to life here. Pure data.
// Update 0.3.21 — the manor (MD/LOBBY_MANOR_PLAN.md): in the great hall, the gate's guard (the horses, tall candelabra),
// standing banners down the carpet, the altars (each its sign on it) and the Fate Cards' table along the east wall, the
// crystal's pedestal and tall candelabra on its dais; the galleries' pedestals (galleries.ts: the weapons', the items')
// with a carpet from the hall's arch past them; the dining hall and the library (roomFurniture.ts); upstairs in the
// bestiary, a row of plinths for each floor's enemies (the floors with none of their own yet: four bare plinths), its
// boss's big plinth by the far wall, a wide carpet down the entrance aisle; in the cards gallery, a carpet down its
// middle between two lines of tall candelabra.
import { collection } from '../../sim/lobby/collection';
import { ITEM_STANDS, WEAPON_STANDS } from './galleries';
import { rowOf, ROWS } from './hallTrim';
import { HEARTH, roomFurniture } from './roomFurniture';
import { ALTAR_H, ALTARS, CARD_STAND, CRYSTAL_DAIS, WING } from './spots';

export { HEARTH };

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
const put = (piece: string, x: number, y: number, z: number, rot = 0, s: number | [number, number, number] = 1, solid?: [number, number, number]) =>
  list.push({ piece, x, y, z, rot, s: typeof s === 'number' ? [s, s, s] : s, solid });

const WEST = -Math.PI / 2;

/** A bestiary plinth (the small pedestal made a plinth: its top, m), and a boss's (the big one). */
export const PLINTH = { scale: 0.42, top: 2.31 * 0.42, boss: 0.6, bossTop: 2.19 * 0.6 } as const;
/** A gallery's pedestal (its top, m): its exhibit turns over it (engine/lobby/galleryView.ts). */
export const PEDESTAL = { scale: 0.5, top: 2.31 * 0.5 } as const;
/** The cards gallery's tall candelabra (their flames light it: hallDressing.ts). */
export const CARD_ROOM_CANDLES: readonly { x: number; z: number }[] = [-14, -4, 6].flatMap((z) => [20, 28].map((x) => ({ x, z })));

// The gate's guard: two rearing horses, two tall candelabra.
for (const k of [-1, 1]) {
  put('lobby_p1_Statue_Horse', k * 8.6, 0, -19, 0, 1, [1.8, 5.9, 3.4]);
  put('kit_p2_Candelabrum_tall', k * 4, 0, -20.6, 0, 1.25, [0.7, 2.3, 0.7]);
}

// Standing banners lining the carpet: up to the gate, and on from the crystal's dais towards the paintings.
for (const k of [-1, 1]) for (const z of [-16, -9.5, 10.5, 15]) put('lobby_p1_Banner', k * 2.7, 0, z, 0, 1.1, [0.4, 4.2, 0.4]);

// The difficulties: an altar each along the east wall, its sign over it on the wall (hallTrim.ts), what it stands for
// on it.
const SIGNS = ['lobby_r_Heart', 'lobby_r_Sword_big', 'lobby_r_Skull2'];
ALTARS.forEach((a, i) => {
  put('lobby_p1_Pedestal2', a.x, 0, a.z, WEST, [0.62, 0.5, 0.62], [1.1, ALTAR_H, 1.1]);
  put(SIGNS[i], a.x, ALTAR_H, a.z, WEST, 0.55);
});

// Update 0.2.17 — the Fate Cards' stand, after the altars: a small table, a candle at each end (its card floats over
// it: engine/lobby/fateStand.ts).
put('lobby_p1_Table_Small', CARD_STAND.x, 0, CARD_STAND.z, 0, 1, [1.3, 0.85, 1.98]);
for (const dz of [-0.72, 0.72]) put('lobby_p2_Candle', CARD_STAND.x - 0.2, 0.85, CARD_STAND.z + dz, 0, 0.35);

// The crystal's dais: its pedestal in the middle of the top step (the crystal floats over it: engine/lobby/
// crystalView.ts), a tall candelabrum at each corner of the lower step.
const c = CRYSTAL_DAIS;
put('lobby_p1_Pedestal2', c.x, 2 * c.step, c.z, 0, [0.62, 0.5, 0.62], [1.1, ALTAR_H, 1.1]);
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('kit_p2_Candelabrum_tall', c.x + dx * (c.outer - 0.55), c.step, c.z + dz * (c.outer - 0.55), 0, 1.1, [0.7, 2, 0.7]);

roomFurniture(put);

// The galleries: a pedestal for each exhibit, a carpet from the hall's arch along the front of each.
for (const s of [...WEAPON_STANDS, ...ITEM_STANDS]) put('lobby_p1_Pedestal2', s.x, 0, s.z, 0, PEDESTAL.scale, [0.85, PEDESTAL.top, 0.85]);
for (const s of [-1, 1]) for (let k = 0; k < 3; k++) put('kit_p2_Carpet', s * (WING.x0 + 2.6 + k * 5.1), 0.005, -4.4, Math.PI / 2, [1.15, 0.15, 0.95]);

// Upstairs, the bestiary: each floor's row of plinths from the entrance aisle out (four bare ones where a floor has none
// of its own yet), its boss's plinth by the far wall; a wide carpet down the aisle.
for (const shelf of collection()) {
  const r = rowOf(shelf.floor - 1);
  const n = Math.max(4, shelf.enemies.length);
  for (let j = 0; j < n; j++) put('lobby_p1_Pedestal2', r.side * (ROWS.start + j * ROWS.step), WING.upper, r.z, 0, PLINTH.scale, [0.7, PLINTH.top, 0.7]);
  if (shelf.boss) put('lobby_p1_Pedestal', r.side * ROWS.boss, WING.upper, r.z, 0, PLINTH.boss, [1.15, PLINTH.bossTop, 1.15]);
}
for (let k = 0; k < 6; k++) put('kit_p2_Carpet', -(WING.x0 + 2.4), WING.upper + 0.005, WING.z0 + 2.95 + k * 5.15, 0, [1.3, 0.15, 0.96]);

// The cards gallery: a carpet down its middle, tall candelabra either side of it.
for (let k = 0; k < 5; k++) put('kit_p2_Carpet', 24, WING.upper + 0.005, WING.z0 + 4.2 + k * 5.4, 0, [1.5, 0.15, 1]);
for (const c of CARD_ROOM_CANDLES) put('kit_p2_Candelabrum_tall', c.x, WING.upper, c.z, 0, 1.2, [0.7, 2.2, 0.7]);

export const FURNITURE: readonly Prop[] = list;

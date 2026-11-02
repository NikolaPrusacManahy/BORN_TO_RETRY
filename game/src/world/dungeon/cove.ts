// Update 0.3.14 — floor 6, Skull Cove (coveRooms.ts): its powder kegs and set pieces as the floor lays them out, and
// their dressing (the Pirate Kit's pieces: export_dungeon_kit.py). A keg is a block until it blows up
// (sim/dungeon/powder.ts); the cove's view draws it, so it can go. A set piece is a rectangle of one letter: a beached
// wreck (its deck a platform at Deck), a small boat up on the sand, a house, a rock outcrop, giant bones (a 2×2 skull,
// or an arch of ribs with its feet solid). (Its cannons are gone: the designer, "they are far far unmanagable on fast
// gameplay".) Pure.
import type { Rng } from '../../core/rng';
import type { ArenaBox } from '../arena';
import type { Put } from './dressExtras';
import { CELL, cellAt, cellX, cellZ, FloorPlan } from './floorPlan';
import type { Cell } from './rooms';

export interface KegSpot {
  x: number;
  z: number;
  room: number;
  /** Its block (taken out of the world when it blows up). */
  box: ArenaBox;
}

export type PieceKind = 'wreck' | 'boat' | 'house' | 'outcrop' | 'bones';

/** A set piece: its middle and size (m), whether its long side runs along x, its room. */
export interface SetPiece {
  kind: PieceKind;
  x: number;
  z: number;
  w: number;
  d: number;
  room: number;
}

export interface Cove {
  kegs: KegSpot[];
  /** Update 0.3.15 — the boardwalks' cells (Mako can't dive into them). */
  boards: ArenaBox[];
  pieces: SetPiece[];
}

/** The wreck's deck height (m: a high ledge's); a keg's block (side, height, m). */
export const DECK = 2.5;
export const KEG_BOX = { side: 1.3, h: 1.3 };
/** The arch's feet: their side (m), how high (m), how far in from its ends (share of its length). */
const FOOT = { side: 1.2, h: 3, in: 0.08 };

/** The Pirate Kit's pieces and how they're used. */
export const PIRATE = {
  ship: 'kit_pf_Ship_Large',
  /** The ship's main deck over its keel (m, as it comes) and its size. */
  shipDeck: 2.6,
  shipSize: [15.43, 5.3] as const,
  houses: [
    // (piece, length, depth, height as they come)
    ['kit_pf_Environment_House1', 13.54, 4.59, 6.77],
    ['kit_pf_Environment_House3', 8.46, 3.78, 10.64],
    ['kit_pf_Environment_House2', 3.77, 3.74, 9.38],
  ] as const,
  cliffs: [
    ['kit_pf_Environment_Cliff1', 5.63, 5.41, 2.96],
    ['kit_pf_Environment_Cliff2', 8.0, 7.11, 6.91],
    ['kit_pf_Environment_Cliff3', 6.86, 5.95, 6.17],
    ['kit_pf_Environment_Cliff4', 7.38, 7.12, 5.53],
  ] as const,
  skull: ['kit_pf_Environment_Skulls', 4.14, 4.44, 3.81] as const,
  smallBoat: ['kit_pf_Ship_Small', 5.15, 3.6, 1.99] as const,
  bones: ['kit_pf_Environment_LargeBones', 6.5, 6.62, 3.43] as const,
  dock: 'kit_pf_Environment_Dock',
  /** The dock's deck over its stilts' feet (m, as it comes). */
  dockDeck: 2.5,
  boat: 'kit_pf_Ship_Small',
  palms: ['kit_pf_Environment_PalmTree_1', 'kit_pf_Environment_PalmTree_2', 'kit_pf_Environment_PalmTree_3'],
  palmScale: 1.8,
  treasure: ['kit_pf_Prop_Chest_Gold', 'kit_pf_Prop_Coins', 'kit_pf_Prop_GoldBag', 'kit_pf_Prop_Chest_Closed', 'kit_pf_Prop_Coins'],
  /** Update 0.3.16 — on the Big Shark's sand. */
  seabed: ['kit_pf_Prop_Chest_Gold', 'kit_pf_Prop_Coins', 'kit_pf_Prop_Skull', 'kit_pf_Prop_CannonBall', 'kit_pf_Prop_Anchor', 'kit_pf_Prop_GoldBag', 'kit_pf_Prop_Skull'],
};

const SET: Partial<Record<Cell, PieceKind>> = { wreck: 'wreck', boat: 'boat', house: 'house', outcrop: 'outcrop', bones: 'bones' };

export const noCove = (): Cove => ({ kegs: [], pieces: [], boards: [] });

/** The cove of floor `plan` (empty on a floor without one); every block goes into `boxes`. */
export function coveOf(plan: FloorPlan, boxes: ArenaBox[]): Cove {
  const cove = noCove();
  for (const r of plan.rooms) {
    const { w, h, cells } = r.layout;
    const seen = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const c = cells[row * w + col];
        const x = cellX(r.x0 + col);
        const z = cellZ(r.z0 + row);
        if (c === 'boardwalk') cove.boards.push({ x, y: -0.05, z, w: CELL, h: 0.1, d: CELL, kind: 'accent' });
        if (c === 'keg') {
          const box = block(x, z, KEG_BOX.side, KEG_BOX.side, KEG_BOX.h);
          cove.kegs.push({ x, z, room: r.index, box });
          boxes.push(box);
        }
        const kind = SET[c];
        if (!kind || seen[row * w + col]) continue;
        let pw = 0;
        while (col + pw < w && cells[row * w + col + pw] === c) pw++;
        let ph = 0;
        while (row + ph < h && cells[(row + ph) * w + col] === c) ph++;
        for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) seen[(row + j) * w + col + i] = 1;
        const p: SetPiece = { kind, x: x + ((pw - 1) * CELL) / 2, z: z + ((ph - 1) * CELL) / 2, w: pw * CELL, d: ph * CELL, room: r.index };
        cove.pieces.push(p);
        boxes.push(...pieceBoxes(p));
      }
    }
  }
  return cove;
}

const block = (x: number, z: number, w: number, d: number, h: number): ArenaBox => ({ x, y: h / 2, z, w, h, d, kind: 'block' });

/** How a set piece's model fits its rectangle: the model, its scale, its turn (a quarter when the rectangle's long side
 *  runs along z) and how far up it stands. */
export function fitPiece(p: SetPiece, pick: number): { piece: string; s: number; turn: number; y: number; h: number } {
  const along = p.w >= p.d;
  const long = Math.max(p.w, p.d);
  const short = Math.min(p.w, p.d);
  const turn = along ? 0 : Math.PI / 2;
  if (p.kind === 'wreck') {
    const s = Math.min(long / PIRATE.shipSize[0], short / PIRATE.shipSize[1]);
    return { piece: PIRATE.ship, s, turn, y: DECK - PIRATE.shipDeck * s, h: DECK };
  }
  const list = p.kind === 'house' ? PIRATE.houses : p.kind === 'outcrop' ? PIRATE.cliffs : p.kind === 'boat' ? [PIRATE.smallBoat] : [long > 4 ? PIRATE.bones : PIRATE.skull];
  // The one whose shape is nearest the rectangle's (and, among the cliffs, as the floor's dice say).
  const ratio = long / short;
  const sorted = [...list].sort((a, b) => Math.abs(a[1] / a[2] - ratio) - Math.abs(b[1] / b[2] - ratio));
  const [piece, len, dep, high] = p.kind === 'outcrop' ? sorted[Math.floor(pick * sorted.length)] : sorted[0];
  const s = Math.min(long / len, short / dep);
  return { piece, s, turn, y: 0, h: Math.min(p.kind === 'house' ? 7 : 6, high * s) };
}

/** A set piece's blocks: the wreck's deck, a house or an outcrop whole, a skull whole, an arch's two feet. */
function pieceBoxes(p: SetPiece): ArenaBox[] {
  const fit = fitPiece(p, 0);
  if (p.kind === 'bones' && Math.max(p.w, p.d) > 4) {
    const along = p.w >= p.d;
    const half = (Math.max(p.w, p.d) / 2) * (1 - FOOT.in * 2);
    return [-1, 1].map((k) => block(p.x + (along ? k * half : 0), p.z + (along ? 0 : k * half), FOOT.side, FOOT.side, FOOT.h));
  }
  return [block(p.x, p.z, p.w, p.d, fit.h)];
}

/** The cove's own dressing, room by room: each set piece's model, the boardwalks (the kit's dock, sunk so
 *  its deck is the floor, its stilts in the sea), boats on the docks' sea, treasure heaped in the hoard. (The kegs are
 *  the view's.) */
export function dressCove(plan: FloorPlan, rng: Rng, put: Put) {
  const cove = coveOf(plan, []);
  for (const p of cove.pieces) {
    const fit = fitPiece(p, rng());
    put(fit.piece, p.x, fit.y, p.z, fit.turn + (rng() < 0.5 ? Math.PI : 0), fit.s, fit.s, fit.s);
  }
  for (const r of plan.rooms) {
    const { w, h, cells } = r.layout;
    const id = r.layout.template.id;
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const c = cells[row * w + col];
        const x = cellX(r.x0 + col);
        const z = cellZ(r.z0 + row);
        if (c === 'boardwalk') {
          // Its planks along the way the boardwalk runs.
          const along = cellAt(plan, r.x0 + col - 1, r.z0 + row) === 'boardwalk' || cellAt(plan, r.x0 + col + 1, r.z0 + row) === 'boardwalk';
          put(PIRATE.dock, x, -PIRATE.dockDeck, z, along ? Math.PI / 2 : 0, CELL / 2.18, 1, CELL / 2.66);
        } else if (c === 'lava' && id === 'the docks' && rng() < 0.012) {
          put(PIRATE.boat, x, -1.75, z, rng() * Math.PI * 2, 1.1, 1.1, 1.1);
        } else if (c === 'floor' && id === 'the hoard' && rng() < 0.12) {
          const s = 1 + 0.4 * rng();
          put(PIRATE.treasure[Math.floor(rng() * PIRATE.treasure.length)], x + (rng() - 0.5), 0, z + (rng() - 0.5), rng() * Math.PI * 2, s, s, s);
        } else if (c === 'floor' && id === "the shark's graveyard" && rng() < 0.05) {
          // (Update 0.3.16 — what lies on the Big Shark's sand: treasure, skulls, cannonballs, an anchor.)
          const s = 1 + 0.5 * rng();
          put(PIRATE.seabed[Math.floor(rng() * PIRATE.seabed.length)], x + (rng() - 0.5), 0, z + (rng() - 0.5), rng() * Math.PI * 2, s, s, s);
        }
      }
    }
  }
}

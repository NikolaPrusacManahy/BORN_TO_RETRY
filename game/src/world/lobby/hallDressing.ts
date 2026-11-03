// Update 0.2.9 — what the lobby looks like (spots.ts): where each kit piece goes. The dungeon's brick floor and walls,
// five bricks high and capped, with solid dark cores behind them; a closed roof (the designer: "closed roof"): a ceiling
// on dark timber beams, chandeliers hanging from them; the great arch of the main gate with its portcullis and the dark
// beyond; the characters' dais; a red carpet from the start to the gate; banners and wall torches; the boards the game
// writes on; and the furniture (furniture.ts). Pure.
// Update 0.3.21 — the manor (MD/LOBBY_MANOR_PLAN.md): its walls (manorWalls.ts: the great hall, the two wings, each
// wing's two rooms below and its bestiary above); every floor tiled (the wings' upper floors over their rooms, beamed
// under, the rooms' roofs beamed too); the grand stairs, three flights each on a brick base with their side covers, up
// to the landings in the north corners (fenced, a doorway into the bestiary); the characters' dais along the west wall;
// the crystal's dais in the middle (two steps); the carpet from the gate to the crystal and on to the paintings;
// windows lit from outside; torches and banners where they light and dress a room. Boards and windows: hallTrim.ts.
import type { ArenaBox } from '../arena';
import type { Placement } from '../dungeon/dressing';
import { CARD_ROOM_CANDLES, FURNITURE, HEARTH } from './furniture';
import { Board, hallBoards, Pane, windows } from './hallTrim';
import { CAP_H, manorCores, manorWalls, WALL, wallPieces } from './manorWalls';
import { BEAMS, BRICK, CHANDELIERS, CRYSTAL_DAIS, DAIS, GATE, HALL, STAIR, WALL_DEPTH, WING } from './spots';

export type { Board, Pane } from './hallTrim';

export interface HallDressing {
  pieces: Placement[];
  /** The portcullis (its own mesh: it rises as you go through). */
  bars: Placement;
  /** The roofs: their ceiling tiles (they cast no shadow), and the timber beams under them and under the wings' upper
   *  floors (boxes). */
  ceiling: Placement[];
  beams: ArenaBox[];
  /** Each chandelier's ring (its middle; its candles are among the pieces, its chain runs up to its beam). */
  chandeliers: { x: number; y: number; z: number }[];
  /** Where torch flames burn (for the lights), and the dining hall's fire. */
  torches: { x: number; y: number; z: number }[];
  hearth: { x: number; y: number; z: number };
  /** The solid cores outside the walls and in the daises; the dark beyond the gate (drawn from the inside). */
  cores: ArenaBox[];
  dark: ArenaBox;
  boards: Board[];
  /** The windows' daylight, behind their frames. */
  panes: Pane[];
}

export const FLOOR = 'kit_p1_Floor_Modular';
const TILE = 0.25;
const TORCH_Y = 2.2;
/** The great arch (the kit's, 4.1 × 4 m as it comes) and its portcullis, scaled up to the gateway. */
const ARCH_SCALE: [number, number, number] = [2.44, 2, 1.4];
const BARS_SCALE: [number, number, number] = [2.36, 1.87, 1.5];
const ARCH_DEPTH = 1.4;
/** A beam's width and depth (m). */
const BEAM_W = 0.5;
const BEAM_H = 0.6;
/** A chandelier: its ring's radius (m) and its candles. */
export const RING_R = 0.85;
const RING_CANDLES = 8;
/** A wall's face is this far from its middle line; a torch and a banner stand this far off the face (m). */
const HALF = WALL_DEPTH / 2;
const TORCH_OFF = HALF + 0.55;
const BANNER_OFF = HALF + 0.3;
const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const NORTH = Math.PI;

type Put = (piece: string, x: number, y: number, z: number, rot?: number, sx?: number, sy?: number, sz?: number) => void;

/** Tiles over x0..x1, z0..z1 (m, whole bricks), their tops at y. */
function tiles(put: Put, x0: number, x1: number, z0: number, z1: number, y: number) {
  for (let x = x0 + BRICK / 2; x < x1; x += BRICK) for (let z = z0 + BRICK / 2; z < z1; z += BRICK) put(FLOOR, x, y - TILE, z);
}

/** A raised floor (a dais, a step): tiled on top, a low brick face round its edges (none against a wall at x0). */
function raised(put: Put, x0: number, x1: number, z0: number, z1: number, y0: number, h: number, walled = false) {
  tiles(put, x0, x1, z0, z1, y0 + h);
  const s = h / BRICK;
  for (let x = x0 + BRICK / 2; x < x1; x += BRICK) {
    put(WALL, x, y0, z0 + HALF, NORTH, 1, s, 1);
    put(WALL, x, y0, z1 - HALF, 0, 1, s, 1);
  }
  for (let z = z0 + BRICK / 2; z < z1; z += BRICK) {
    if (!walled) put(WALL, x0 + HALF, y0, z, WEST, 1, s, 1);
    put(WALL, x1 - HALF, y0, z, EAST, 1, s, 1);
  }
}

/** A grand stair (side −1 west, 1 east): its flights (the kit's 2 m one rises north; stretched to `run` and widened),
 *  their side covers on the hall's side, the brick base under them and under the landing, the landing's floor and its
 *  fence. */
function stair(put: Put, side: number) {
  const s = STAIR;
  const x = side * -s.x;
  const inner = x - side * (s.w / 2 - HALF);
  const face = side < 0 ? EAST : WEST;
  for (let k = 0; k < s.flights; k++) {
    const z = s.foot - s.run * (k + 0.5);
    put('lobby_p1_Stairs_Modular', x, k * BRICK, z, 0, s.w / 2, 1, s.run / 2);
    put('lobby_p1_Stairs_SideCover', inner, k * BRICK, z, 0, 1, 1, s.run / 2);
    for (let r = 0; r < k; r++) put(WALL, inner, r * BRICK, z, face, s.run / BRICK, 1, 1);
  }
  // The landing: on bricks, tiled, fenced along the hall's side.
  const depth = s.top + HALL.halfD;
  const mid = (s.top - HALL.halfD) / 2;
  for (let r = 0; r < s.flights; r++) put(WALL, inner, r * BRICK, mid, face, depth / BRICK, 1, 1);
  put(FLOOR, x, WING.upper - TILE, mid, 0, s.w / BRICK, 1, depth / BRICK);
  put('lobby_p1_Fence_Straight_Modular', inner, WING.upper, mid, EAST, depth / BRICK, 1, 1);
}

/** A torch on a wall (and its light), the wall's face `rot` turned towards the room. */
function torch(put: Put, torches: HallDressing['torches'], x: number, z: number, rot: number, y = TORCH_Y) {
  put('kit_p2_Torch_wall', x, y, z, rot - Math.PI / 2);
  torches.push({ x: x + Math.sin(rot) * 0.4, y: y + 1.2, z: z + Math.cos(rot) * 0.4 });
}

export function dressHall(): HallDressing {
  const { halfW: w, halfD: d, wallH } = HALL;
  const pieces: Placement[] = [];
  const torches: HallDressing['torches'] = [];
  const put: Put = (piece, x, y, z, rot = 0, sx = 1, sy = 1, sz = 1) => pieces.push({ piece, x, y, z, rot, sx, sy, sz });
  const wing = (s: number): [number, number] => (s < 0 ? [-WING.x1, -WING.x0] : [WING.x0, WING.x1]);

  // The floors: the hall, the wings' rooms, the wings' upper floors (the bestiary), under the arch up to the portcullis.
  tiles(put, -w, w, -d, d, 0);
  for (const s of [-1, 1]) {
    const [x0, x1] = wing(s);
    tiles(put, x0, x1, WING.z0, WING.z1, 0);
    tiles(put, x0, x1, WING.z0, WING.z1, WING.upper);
  }
  const gateway = -d - GATE.barsZ;
  for (const x of [-2, 0, 2]) put(FLOOR, x, -TILE, -d - gateway / 2, 0, 1, 1, gateway / BRICK);

  for (const l of manorWalls()) wallPieces(l, pieces);

  // The main gate: the great arch, its portcullis, the dark beyond.
  put('kit_p1_Arch', 0, 0, -d - ARCH_DEPTH / 2, 0, ...ARCH_SCALE);
  const bars: Placement = { piece: 'kit_p1_Arch_bars', x: 0, y: 0, z: GATE.barsZ, rot: 0, sx: BARS_SCALE[0], sy: BARS_SCALE[1], sz: BARS_SCALE[2] };
  const dark: ArenaBox = { x: 0, y: 3.25, z: -27.4, w: 6.8, h: 7.1, d: 9.3, kind: 'wall' };

  // The characters' dais along the west wall; the crystal's dais in the middle, in two steps.
  raised(put, -w, DAIS.x0, DAIS.z0, DAIS.z1, 0, DAIS.h, true);
  const c = CRYSTAL_DAIS;
  raised(put, c.x - c.outer, c.x + c.outer, c.z - c.outer, c.z + c.outer, 0, c.step);
  raised(put, c.x - c.inner, c.x + c.inner, c.z - c.inner, c.z + c.inner, c.step, c.step);

  for (const s of [-1, 1]) stair(put, s);

  // The roofs: the hall's ceiling tiles on its caps, beams across under them; the wings' too, and beams under their
  // upper floors (their rooms' ceilings); a chandelier hanging from some of the hall's beams.
  const roof = wallH + CAP_H;
  const ceiling: Placement[] = [];
  const ceil = (x0: number, x1: number, z0: number, z1: number) => {
    for (let x = x0 + 1; x < x1; x += BRICK) for (let z = z0 + 1; z < z1; z += BRICK) ceiling.push({ piece: FLOOR, x, y: roof, z, rot: 0, sx: 1, sy: 1, sz: 1 });
  };
  ceil(-w, w, -d, d);
  const beams: ArenaBox[] = BEAMS.map((z) => ({ x: 0, y: roof - BEAM_H / 2, z, w: 2 * w, h: BEAM_H, d: BEAM_W, kind: 'block' }));
  for (const s of [-1, 1]) {
    const [x0, x1] = wing(s);
    ceil(x0, x1, WING.z0, WING.z1);
    for (const z of [-19, -13, -2, 4]) {
      beams.push({ x: (x0 + x1) / 2, y: roof - BEAM_H / 2, z, w: x1 - x0, h: BEAM_H, d: BEAM_W, kind: 'block' });
      beams.push({ x: (x0 + x1) / 2, y: WING.upper - TILE - BEAM_H / 2, z, w: x1 - x0, h: BEAM_H, d: BEAM_W, kind: 'block' });
    }
  }
  const chandeliers = CHANDELIERS.map((ch) => ({ ...ch }));
  for (const ch of chandeliers) {
    for (let i = 0; i < RING_CANDLES; i++) {
      const a = (i / RING_CANDLES) * Math.PI * 2;
      put('lobby_p2_Candle', ch.x + Math.cos(a) * RING_R, ch.y + 0.02, ch.z + Math.sin(a) * RING_R, -a, 0.4);
    }
  }

  // The red carpet: from the gate to the crystal's dais, and from it on towards the paintings.
  const runs: [number, number, number][] = [
    [-d + 0.3, c.z - c.outer - 0.2, 4],
    [c.z + c.outer + 0.2, d - 2.2, 3],
  ];
  for (const [z0, z1, n] of runs) {
    const rug = (z1 - z0) / n;
    for (let i = 0; i < n; i++) put('kit_p2_Carpet', 0, 0.005, z0 + (i + 0.5) * rug, 0, 1.2, 0.15, rug / 5.35);
  }

  // Torches: the hall's, between its stations (high over the dais; between the altars' boards); each wing room's on its
  // outer wall, between its windows; the bestiary's between its windows.
  for (const x of [-8.5, 8.5]) torch(put, torches, x, -d + TORCH_OFF, 0);
  for (const z of [1, 5.5, 14, 20]) torch(put, torches, -w + TORCH_OFF, z, EAST, z > 7 ? 4.2 : TORCH_Y);
  for (const z of [0, 5.25, 9.75, 14.25, 20]) torch(put, torches, w - TORCH_OFF, z, WEST);
  for (const s of [-1, 1]) {
    const face = s < 0 ? EAST : WEST;
    const outer = s * (WING.x1 - TORCH_OFF);
    for (const z of [-20.5, -9.5, -6.5, 8.5]) torch(put, torches, outer, z, face);
    if (s < 0) for (const z of [-14, -8, -2, 4]) torch(put, torches, outer, z, face, WING.upper + TORCH_Y);
  }
  // (The cards gallery's light: its tall candelabra's flames.)
  for (const c of CARD_ROOM_CANDLES) torches.push({ x: c.x, y: WING.upper + 2.4, z: c.z });

  // Banners: over the dais and over each altar's board, by the gate; in each room downstairs, on its outer wall between
  // its windows (under its ceiling).
  for (const z of [11, 17]) put('kit_p1_Banner_wall', -w + BANNER_OFF, 5.6, z, EAST);
  for (const z of [3, 7.5, 12]) put('kit_p1_Banner_wall', w - BANNER_OFF, 5.6, z, WEST);
  for (const x of [-11, 11]) put('kit_p1_Banner_wall', x, 3.6, -d + BANNER_OFF, 0);
  for (const s of [-1, 1]) for (const z of [-15, 1]) put('kit_p1_Banner_wall', s * (WING.x1 - BANNER_OFF), 2.6, z, s < 0 ? EAST : WEST);

  for (const f of FURNITURE) put(f.piece, f.x, f.y, f.z, f.rot, ...f.s);
  const { panes, frames } = windows();
  pieces.push(...frames);

  return { pieces, bars, ceiling, beams, chandeliers, torches, hearth: { ...HEARTH, y: HEARTH.y + 0.9 }, cores: [...manorCores(), ...daisCores()], dark, boards: hallBoards(), panes };
}

/** The daises' cores (under their tiles, behind their faces). */
function daisCores(): ArenaBox[] {
  const box = (x0: number, z0: number, x1: number, z1: number, y1: number): ArenaBox => ({ x: (x0 + x1) / 2, y: (y1 - 0.5) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: y1 + 0.5, d: z1 - z0, kind: 'wall' });
  const c = CRYSTAL_DAIS;
  const i = 0.2;
  return [box(-HALL.halfW, DAIS.z0 + i, DAIS.x0 - i, DAIS.z1 - i, DAIS.h - 0.27), box(c.x - c.outer + i, c.z - c.outer + i, c.x + c.outer - i, c.z + c.outer - i, 2 * c.step - 0.27)];
}

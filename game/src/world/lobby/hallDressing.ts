// Update 0.2.9 — what the lobby looks like (spots.ts): where each kit piece goes. The dungeon's brick floor and walls,
// five bricks high and capped, with solid dark cores behind them (as the dungeon's: no notch opens); a closed roof (the
// designer: "closed roof"): a ceiling on dark timber beams, chandeliers hanging from them; the great arch of the main
// gate with its portcullis and the dark beyond; the characters' dais; a red carpet from the start to the gate; banners,
// wall torches and swords on the walls; the boards the game writes on (the gate's: your difficulty and character; each
// difficulty's name; the credits); and the furniture (furniture.ts). Pure.
import type { ArenaBox } from '../arena';
import type { Placement } from '../dungeon/dressing';
import { FURNITURE } from './furniture';
import { ALTARS, BEAMS, CHANDELIERS, CREDIT_BOARDS, DAIS, GATE, HALL } from './spots';

type Wall = 'n' | 's' | 'w' | 'e';

/** A board the game writes on: its middle, its turn (0 faces south), its size (m), and what it shows. */
export interface Board {
  x: number;
  y: number;
  z: number;
  rot: number;
  w: number;
  h: number;
  kind: 'gate' | 'difficulty' | 'credits';
  /** Which difficulty or credits board (in their orders). */
  index: number;
}

export interface HallDressing {
  pieces: Placement[];
  /** The portcullis (its own mesh: it rises as you go through). */
  bars: Placement;
  /** The roof: its ceiling tiles (they cast no shadow), and the timber beams under it (boxes). */
  ceiling: Placement[];
  beams: ArenaBox[];
  /** Each chandelier's ring (its middle; its candles are among the pieces, its chain runs up to its beam). */
  chandeliers: { x: number; y: number; z: number }[];
  /** Where torch flames burn (for the lights), and the hearth's fire. */
  torches: { x: number; y: number; z: number }[];
  hearth: { x: number; y: number; z: number };
  /** The solid cores behind the walls and in the dais; the dark beyond the gate (drawn from the inside). */
  cores: ArenaBox[];
  dark: ArenaBox;
  boards: Board[];
}

const WALL = 'kit_p1_Wall_Modular';
const CAP = 'kit_p1_WallCover_Modular';
const FLOOR = 'kit_p1_Floor_Modular';
const WALL_DEPTH = 0.44;
const BRICK = 2;
const TORCH_Y = 2.2;
/** A core stands this far behind its faces, from under the floor to just under the caps (as the dungeon's). */
const INSET = 0.2;
const CORE_BOTTOM = -0.5;
/** The great arch (the kit's, 4.1 × 4 m as it comes) and its portcullis, scaled up to the gateway. */
const ARCH_SCALE: [number, number, number] = [2.44, 2, 1.4];
const BARS_SCALE: [number, number, number] = [2.36, 1.87, 1.5];
const ARCH_DEPTH = 1.4;
/** The caps' height (the ceiling rests on them), a beam's width and depth (m). */
const CAP_H = 0.43;
const BEAM_W = 0.5;
const BEAM_H = 0.6;
/** A chandelier: its ring's radius (m) and its candles. */
export const RING_R = 0.85;
const RING_CANDLES = 8;

/** A spot `out` metres in front of a wall's face (negative: behind it), `along` it, and the turn facing into the hall. */
function onWall(wall: Wall, along: number, out: number): [number, number, number] {
  const { halfW: w, halfD: d } = HALL;
  if (wall === 'n') return [along, -d + out, 0];
  if (wall === 's') return [along, d - out, Math.PI];
  if (wall === 'w') return [-w + out, along, Math.PI / 2];
  return [w - out, along, -Math.PI / 2];
}

export function dressHall(): HallDressing {
  const { halfW: w, halfD: d, wallH } = HALL;
  const pieces: Placement[] = [];
  const torches: HallDressing['torches'] = [];
  const put = (piece: string, x: number, y: number, z: number, rot = 0, sx = 1, sy = 1, sz = 1) => pieces.push({ piece, x, y, z, rot, sx, sy, sz });
  const onWallPut = (piece: string, wall: Wall, along: number, out: number, y: number, turn = 0, s = 1) => {
    const [x, z, rot] = onWall(wall, along, out);
    put(piece, x, y, z, rot + turn, s, s, s);
  };

  for (let x = -w + 1; x < w; x += BRICK) for (let z = -d + 1; z < d; z += BRICK) put(FLOOR, x, -0.25, z);
  // Under the arch, up to the portcullis.
  const gateway = -d - GATE.barsZ;
  for (const x of [-2, 0, 2]) put(FLOOR, x, -0.25, -d - gateway / 2, 0, 1, 1, gateway / BRICK);

  // The walls: five bricks high, capped; the north wall leaves the arch's width for the gate, with bricks over it.
  const rows = wallH / BRICK;
  const brick = (wall: Wall, along: number, from = 0) => {
    for (let k = from; k < rows; k++) onWallPut(WALL, wall, along, -WALL_DEPTH / 2, k * BRICK);
    onWallPut(CAP, wall, along, -WALL_DEPTH / 2, wallH);
  };
  for (let z = -d + 1; z < d; z += BRICK) {
    brick('w', z);
    brick('e', z);
  }
  for (let x = -w + 1; x < w; x += BRICK) brick('s', x);
  for (let x = -w + 1; x < w; x += BRICK) brick('n', x, Math.abs(x) < GATE.archHalfW ? rows - 1 : 0);

  // The main gate: the great arch, its portcullis, the dark beyond.
  const archZ = -d - ARCH_DEPTH / 2;
  put('kit_p1_Arch', 0, 0, archZ, 0, ...ARCH_SCALE);
  const bars: Placement = { piece: 'kit_p1_Arch_bars', x: 0, y: 0, z: GATE.barsZ, rot: 0, sx: BARS_SCALE[0], sy: BARS_SCALE[1], sz: BARS_SCALE[2] };
  const dark: ArenaBox = { x: 0, y: 3.25, z: -27.4, w: 6.8, h: 7.1, d: 9.3, kind: 'wall' };

  // The characters' dais: paved on top, a low brick face round it.
  const dh = DAIS.h;
  for (let x = DAIS.x0 + 1; x < w; x += BRICK) for (let z = DAIS.z0 + 1; z < DAIS.z1; z += BRICK) put(FLOOR, x, dh - 0.25, z);
  for (let z = DAIS.z0 + 1; z < DAIS.z1; z += BRICK) put(WALL, DAIS.x0 + WALL_DEPTH / 2, 0, z, -Math.PI / 2, 1, dh / BRICK, 1);
  for (let x = DAIS.x0 + 1; x < w; x += BRICK) {
    put(WALL, x, 0, DAIS.z0 + WALL_DEPTH / 2, Math.PI, 1, dh / BRICK, 1);
    put(WALL, x, 0, DAIS.z1 - WALL_DEPTH / 2, 0, 1, dh / BRICK, 1);
  }

  // The roof: ceiling tiles on the caps, beams across under them; a chandelier hanging from some.
  const roof = wallH + CAP_H;
  const ceiling: Placement[] = [];
  for (let x = -w + 1; x < w; x += BRICK) for (let z = -d + 1; z < d; z += BRICK) ceiling.push({ piece: FLOOR, x, y: roof, z, rot: 0, sx: 1, sy: 1, sz: 1 });
  const beams: ArenaBox[] = BEAMS.map((z) => ({ x: 0, y: roof - BEAM_H / 2, z, w: 2 * w, h: BEAM_H, d: BEAM_W, kind: 'block' }));
  const chandeliers = CHANDELIERS.map((c) => ({ ...c }));
  for (const c of chandeliers) {
    for (let i = 0; i < RING_CANDLES; i++) {
      const a = (i / RING_CANDLES) * Math.PI * 2;
      put('lobby_p2_Candle', c.x + Math.cos(a) * RING_R, c.y + 0.02, c.z + Math.sin(a) * RING_R, -a, 0.4);
    }
  }

  // The red carpet: six rugs end to end, from the start up to the gate.
  const rug = (17.3 - (-d + 0.3)) / 6;
  for (let i = 0; i < 6; i++) put('kit_p2_Carpet', 0, 0.005, -d + 0.3 + (i + 0.5) * rug, 0, 1.2, 0.15, rug / 5.35);

  // On the walls: torches (each a light), banners over the altars and behind the characters, swords by the gate.
  const torch = (wall: Wall, along: number) => {
    onWallPut('kit_p2_Torch_wall', wall, along, 0.55, TORCH_Y, -Math.PI / 2);
    const [x, z] = onWall(wall, along, 0.95);
    torches.push({ x, y: TORCH_Y + 1.2, z });
  };
  for (const x of [-6.3, 6.3]) torch('n', x);
  for (const x of [-10.5, 10.5]) torch('s', x);
  for (const z of [7, 1, -5, -11, 15]) torch('w', z);
  for (const z of [-12.5, -6.75, -2.25, 2.25, 15]) torch('e', z);
  for (const a of ALTARS) onWallPut('kit_p1_Banner_wall', 'w', a.z, 0.3, 4.5);
  for (const z of [-9, -4.5, 0, 4.5]) onWallPut('kit_p1_Banner_wall', 'e', z, 0.3, dh + 1.3);
  for (const z of [12.5, 18.5]) {
    onWallPut('kit_p1_Banner_wall', 'w', z, 0.3, 3);
    onWallPut('kit_p1_Banner_wall', 'e', z, 0.3, 3);
  }
  for (const x of [-10.5, 10.5]) onWallPut('lobby_p1_Sword_WallMount', 'n', x, 0.12, 3.2);

  for (const f of FURNITURE) pieces.push({ piece: f.piece, x: f.x, y: f.y, z: f.z, rot: f.rot, sx: f.s[0], sy: f.s[1], sz: f.s[2] });

  const boards: Board[] = [{ x: 0, y: 8.95, z: -d + 0.06, rot: 0, w: 8, h: 1.6, kind: 'gate', index: 0 }];
  ALTARS.forEach((a, i) => boards.push({ x: -w + 0.06, y: 3.55, z: a.z, rot: Math.PI / 2, w: 4.4, h: 1.3, kind: 'difficulty', index: i }));
  CREDIT_BOARDS.forEach((x, i) => boards.push({ x, y: 3, z: d - 0.06, rot: Math.PI, w: 4.6, h: 3.4, kind: 'credits', index: i }));

  return { pieces, bars, ceiling, beams, chandeliers, torches, hearth: { x: 11.8, y: 0.9, z: 17.6 }, cores: coresOf(), dark, boards };
}

/** The walls' cores (the north one round the gateway), the dais's, the slab over the roof and the one under the floor. */
function coresOf(): ArenaBox[] {
  const { halfW: w, halfD: d, wallH } = HALL;
  const top = wallH - 0.02;
  const g = GATE.halfW + 0.1;
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): ArenaBox => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: y1 - y0, d: z1 - z0, kind: 'wall' });
  return [
    box(-w - 2, CORE_BOTTOM, -d - 2, -w - INSET, top, d + 2),
    box(w + INSET, CORE_BOTTOM, -d - 2, w + 2, top, d + 2),
    box(-w - 2, CORE_BOTTOM, d + INSET, w + 2, top, d + 2),
    box(-w - 2, CORE_BOTTOM, -d - 2, -g, top, -d - INSET),
    box(g, CORE_BOTTOM, -d - 2, w + 2, top, -d - INSET),
    box(-g, GATE.height + 0.1, -d - 2, g, top, -d - INSET),
    box(DAIS.x0 + INSET, CORE_BOTTOM, DAIS.z0 + INSET, w, DAIS.h - 0.27, DAIS.z1 - INSET),
    // Over the roof's tiles, closing it.
    box(-w - 2, wallH + CAP_H + 0.25, -d - 2, w + 2, wallH + CAP_H + 0.75, d + 2),
    // Under the floor's tiles and the walls' feet, up to the portcullis (no slot at a wall's foot opens below the floor).
    box(-w - 2, -1, GATE.barsZ, w + 2, -0.27, d + 2),
  ];
}

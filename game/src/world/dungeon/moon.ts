// Update 0.3.17 — floor 8, the Moon (moonRooms.ts): its set pieces and craters as the floor lays them out, and their
// dressing (the Ultimate Space Kit's pieces: export_dungeon_kit.py --moon). A set piece is a rectangle of one letter:
// a base module (the house that fits it best; the lander in the middle of the landing site), a geodesic dome, a parked
// rover, solar panels, a boulder (the Nature pack's rock, grey in the moon's light: the Space Kit's rocks are
// Mars-brown, so they're the meteorites). A round piece's block is inset from its rectangle's corners. A crater is a
// rectangle of dust whose dish the view draws (engine/moon/craterView.ts); a big one has a meteorite in its middle (a
// block). Greenhouse beds: soil with alien plants and bushes; an alien tree in a cell of its own (its trunk a block:
// assemble.ts). On the radar ridge, dishes and antennas on the high rock. Pure.
import type { Rng } from '../../core/rng';
import type { ArenaBox } from '../arena';
import type { Put, SandCell } from './dressExtras';
import { CELL, cellX, cellZ, FloorPlan } from './floorPlan';
import type { Cell } from './rooms';

export type MoonPieceKind = 'module' | 'dome' | 'rover' | 'solar' | 'boulder';

/** A set piece: its middle and size (m), its room and the room's id. */
export interface MoonPiece {
  kind: MoonPieceKind;
  x: number;
  z: number;
  w: number;
  d: number;
  room: number;
  id: string;
}

/** A crater: its middle and size (m), its room; a meteorite in its middle or not. */
export interface Crater {
  x: number;
  z: number;
  w: number;
  d: number;
  room: number;
  meteorite: boolean;
}

export interface Moon {
  pieces: MoonPiece[];
  craters: Crater[];
}

/** A crater this wide (m) or wider has a meteorite in its middle, this wide and this high (m: its block). A round
 *  piece's block is this share of its rectangle. */
const METEORITE_FROM = 8;
const METEORITE = { side: 2.4, h: 1.8 };
const ROUND = 0.8;

/** The Space Kit's pieces and how they're used: each model's size as it stands at no turn (along the game's x, along
 *  its z, its height; m). */
export const MOON_KIT = {
  modules: [
    ['kit_m_House_Long', 3.99, 7.79, 4.31],
    ['kit_m_House_Single', 3.99, 3.8, 4.0],
    ['kit_m_Building_L', 7.8, 7.79, 4.31],
    ['kit_m_House_Cylinder', 5.61, 5.61, 4.32],
  ] as const,
  lander: ['kit_m_Base_Large', 8.53, 8.53, 4.97] as const,
  dome: ['kit_m_GeodesicDome', 8.53, 8.53, 5.28] as const,
  rovers: [
    ['kit_m_Rover_1', 4.58, 5.16, 2.6],
    ['kit_m_Rover_2', 4.58, 6.56, 2.6],
    ['kit_m_Rover_Round', 5.79, 3.69, 2.8],
  ] as const,
  solar: ['kit_m_SolarPanel_Structure', 4.0, 4.0, 3.07] as const,
  boulders: [
    ['kit_n_Rock_5', 0.66, 0.91, 0.65],
    ['kit_n_Rock_2', 0.56, 0.57, 0.65],
  ] as const,
  meteorites: ['kit_m_Rock_3', 'kit_m_Rock_1', 'kit_m_Rock_2'],
  plants: ['kit_m_Plant_1', 'kit_m_Plant_2', 'kit_m_Plant_3', 'kit_m_Bush_1', 'kit_m_Bush_2', 'kit_m_Grass_2', 'kit_m_Grass_3'],
  trees: ['kit_m_Tree_Blob_1', 'kit_m_Tree_Light_1', 'kit_m_Tree_Spiral_1', 'kit_m_Tree_Swirl_1', 'kit_m_Tree_Spikes_2'],
  dishes: ['kit_m_Roof_Radar', 'kit_m_Roof_Antenna', 'kit_m_Roof_Radar'],
};

const SET: Partial<Record<Cell, MoonPieceKind>> = { module: 'module', dome: 'dome', rover: 'rover', solar: 'solar', boulder: 'boulder' };

export const noMoon = (): Moon => ({ pieces: [], craters: [] });

/** The moon of floor `plan` (empty on a floor without one); every block goes into `boxes`. */
export function moonOf(plan: FloorPlan, boxes: ArenaBox[]): Moon {
  const moon = noMoon();
  for (const r of plan.rooms) {
    const { w, h, cells } = r.layout;
    const id = r.layout.template.id;
    const seen = new Uint8Array(w * h);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const c = cells[row * w + col];
        const kind = SET[c];
        if ((!kind && c !== 'crater') || seen[row * w + col]) continue;
        let pw = 0;
        while (col + pw < w && cells[row * w + col + pw] === c) pw++;
        let ph = 0;
        while (row + ph < h && cells[(row + ph) * w + col] === c) ph++;
        for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) seen[(row + j) * w + col + i] = 1;
        const x = cellX(r.x0 + col) + ((pw - 1) * CELL) / 2;
        const z = cellZ(r.z0 + row) + ((ph - 1) * CELL) / 2;
        if (!kind) {
          const meteorite = Math.min(pw, ph) * CELL >= METEORITE_FROM;
          moon.craters.push({ x, z, w: pw * CELL, d: ph * CELL, room: r.index, meteorite });
          if (meteorite) boxes.push(block(x, z, METEORITE.side, METEORITE.side, METEORITE.h));
          continue;
        }
        const p: MoonPiece = { kind, x, z, w: pw * CELL, d: ph * CELL, room: r.index, id };
        moon.pieces.push(p);
        const fit = fitMoon(p, 0);
        const k = fit.round ? ROUND : 1;
        boxes.push(block(x, z, p.w * k, p.d * k, fit.h));
      }
    }
  }
  return moon;
}

const block = (x: number, z: number, w: number, d: number, h: number): ArenaBox => ({ x, y: h / 2, z, w, h, d, kind: 'block' });

type Model = readonly [string, number, number, number];

/** How a set piece's model fits its rectangle: the model, its scale (x and z, its height's), its turn, its block's
 *  height and whether it's round. The model (and turn) covering most of the rectangle; a boulder stretched to it. */
export function fitMoon(p: MoonPiece, pick: number): { piece: string; sx: number; sy: number; sz: number; turn: number; h: number; round: boolean } {
  if (p.kind === 'boulder') {
    const [piece, mx, mz, mh] = MOON_KIT.boulders[Math.floor(pick * MOON_KIT.boulders.length)];
    const h = Math.min(3.6, 1.2 + Math.min(p.w, p.d) * 0.5);
    return { piece, sx: (p.w * 1.1) / mx, sy: h / mh, sz: (p.d * 1.1) / mz, turn: 0, h, round: true };
  }
  const list: readonly Model[] = p.kind === 'module' ? (p.id === 'the landing site' && Math.min(p.w, p.d) >= 8 ? [MOON_KIT.lander] : MOON_KIT.modules) : p.kind === 'dome' ? [MOON_KIT.dome] : p.kind === 'rover' ? MOON_KIT.rovers : [MOON_KIT.solar];
  let best = { piece: list[0][0], s: 0, turn: 0, h: 0, cover: -1 };
  for (const [piece, mx, mz, mh] of list) {
    for (const turn of [0, Math.PI / 2]) {
      const [ax, az] = turn ? [mz, mx] : [mx, mz];
      const s = Math.min(p.w / ax, p.d / az);
      const cover = (s * ax * s * az) / (p.w * p.d);
      if (cover > best.cover + 1e-6) best = { piece, s, turn, h: Math.min(6, mh * s), cover };
    }
  }
  const round = best.piece === MOON_KIT.dome[0] || best.piece === MOON_KIT.lander[0] || best.piece === 'kit_m_House_Cylinder';
  return { piece: best.piece, sx: best.s, sy: best.s, sz: best.s, turn: best.turn, h: best.h, round };
}

/** A greenhouse bed's cell: soil (a dark sand cell), and now and then an alien plant or bush; an alien tree's cell, its
 *  tree. */
export function dressFlora(c: Cell, x: number, z: number, rng: Rng, put: Put, sand: SandCell[]) {
  sand.push({ x, z, quick: true });
  if (c === 'alienTree') {
    const s = 0.75 + 0.2 * rng();
    put(MOON_KIT.trees[Math.floor(rng() * MOON_KIT.trees.length)], x, 0, z, rng() * Math.PI * 2, s, s, s);
  } else if (rng() < 0.5) {
    // (The kit's bushes are 2–3 m across: a cell's plant a good deal smaller.)
    const s = 0.4 + 0.25 * rng();
    put(MOON_KIT.plants[Math.floor(rng() * MOON_KIT.plants.length)], x + (rng() - 0.5) * 0.8, 0, z + (rng() - 0.5) * 0.8, rng() * Math.PI * 2, s, s, s);
  }
}

/** The moon's own dressing: each set piece's model, each big crater's meteorite (half sunk), the radar ridge's dishes
 *  and antennas on its high rock. */
export function dressMoon(plan: FloorPlan, rng: Rng, put: Put) {
  const moon = moonOf(plan, []);
  for (const p of moon.pieces) {
    const fit = fitMoon(p, rng());
    put(fit.piece, p.x, 0, p.z, fit.turn + (rng() < 0.5 ? Math.PI : 0), fit.sx, fit.sy, fit.sz);
  }
  for (const c of moon.craters) {
    if (!c.meteorite) continue;
    const s = 0.85 + 0.2 * rng();
    put(MOON_KIT.meteorites[Math.floor(rng() * MOON_KIT.meteorites.length)], c.x, -0.7, c.z, rng() * Math.PI * 2, s, s, s);
  }
  for (const r of plan.rooms) {
    if (r.layout.template.id !== 'radar ridge') continue;
    const { w, h, cells } = r.layout;
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        if (cells[row * w + col] !== 'highLedge' || rng() > 0.3) continue;
        const s = 1.3 + 0.3 * rng();
        put(MOON_KIT.dishes[Math.floor(rng() * MOON_KIT.dishes.length)], cellX(r.x0 + col), 2.5, cellZ(r.z0 + row), rng() * Math.PI * 2, s, s, s);
      }
    }
  }
}

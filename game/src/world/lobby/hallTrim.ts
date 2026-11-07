// Update 0.3.21 — the manor's boards and windows (hallDressing.ts places the building; MD/LOBBY_MANOR_PLAN.md): every
// board the game writes on (boards.ts says what: over the gate, your difficulty and character; over each altar, its
// difficulty; each floor's painting on the south wall; the credits on the bestiary's north wall; each bestiary row's
// floor, hanging at its start); and the windows, each the pack's frame on an outer wall with daylight behind it (in the
// great hall over the paintings and by the gate, in every room downstairs, down the bestiary between its rows; the
// cards gallery's walls are its cards'). Pure.
import type { Placement } from '../dungeon/dressing';
import { ALTARS, HALL, PAINTING, PAINTINGS, RECORDS, WALL_DEPTH, WING } from './spots';

export type BoardKind = 'gate' | 'difficulty' | 'credits' | 'floor' | 'row' | 'records';

/** A board the game writes on: its middle, its turn (0 faces south), its size (m), and what it shows. */
export interface Board {
  x: number;
  y: number;
  z: number;
  rot: number;
  w: number;
  h: number;
  kind: BoardKind;
  /** Which difficulty, credits, floor (0: the first) or bestiary row's floor. */
  index: number;
}

/** A window's daylight: its middle, its turn (0 faces south), its size (m). */
export interface Pane {
  x: number;
  y: number;
  z: number;
  rot: number;
  w: number;
  h: number;
}

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const NORTH = Math.PI;
/** A wall's face is this far from its middle line; boards hang this far off it (m). */
const HALF = WALL_DEPTH / 2;
const OFF = HALF + 0.06;

/** The bestiary's rows (the west wing's upper floor, one a floor): each row's line (z), where it starts by the entrance
 *  aisle (x, from the middle out) and the step between its plinths; its boss's plinth by the far wall. */
export const ROWS = { z: Array.from({ length: 10 }, (_, k) => -18.5 + 3 * k), start: 20, step: 0.9, boss: 31.2 } as const;

/** Floor `floor`'s row (0: the first): its side (the west wing's) and its line (z). */
export const rowOf = (floor: number) => ({ side: -1, z: ROWS.z[floor] });

export function hallBoards(): Board[] {
  const { halfW: w, halfD: d } = HALL;
  const out: Board[] = [{ x: 0, y: 8.95, z: -d + OFF, rot: 0, w: 8, h: 1.6, kind: 'gate', index: 0 }];
  ALTARS.forEach((a, i) => out.push({ x: w - OFF, y: 3.55, z: a.z, rot: WEST, w: 3.4, h: 1.1, kind: 'difficulty', index: i }));
  // (Update 0.5.2 — the records screen, after the Demon.)
  out.push({ x: -w + OFF, y: RECORDS.y, z: RECORDS.z, rot: EAST, w: RECORDS.w, h: RECORDS.h, kind: 'records', index: 0 });
  PAINTINGS.forEach((x, i) => out.push({ x, y: PAINTING.y, z: d - OFF - 0.06, rot: NORTH, w: PAINTING.w, h: PAINTING.h, kind: 'floor', index: i }));
  // The credits on the bestiary's north wall, over its first row (left to right as you face them).
  [-30, -25.2, -20.4].forEach((x, i) => out.push({ x, y: WING.upper + 2.45, z: WING.z0 + OFF, rot: 0, w: 4.2, h: 2.9, kind: 'credits', index: i }));
  for (let f = 0; f < 10; f++) {
    const r = rowOf(f);
    out.push({ x: r.side * (ROWS.start - 0.9), y: WING.upper + 3.05, z: r.z, rot: EAST, w: 2.4, h: 0.7, kind: 'row', index: f });
  }
  return out;
}

/** The windows: on an outer wall at x (a side wall) or z (a north or south wall), from `y` up, facing in. */
export function windows(): { panes: Pane[]; frames: Placement[] } {
  const d = HALL.halfD;
  const spots: { x: number; y: number; z: number; rot: number }[] = [];
  for (const x of [-10, -5, 5, 10]) spots.push({ x, y: 6.4, z: d - HALF, rot: NORTH });
  for (const x of [-8, 8]) spots.push({ x, y: 6.4, z: -d + HALF, rot: 0 });
  for (const s of [-1, 1]) {
    const face = s < 0 ? EAST : WEST;
    const outer = s * (WING.x1 - HALF);
    for (const z of [-18, -12, -3, 5]) spots.push({ x: outer, y: 1.2, z, rot: face });
    // (Upstairs, the bestiary's, between its rows; the cards gallery's walls are its cards'.)
    if (s < 0) for (const z of [-17, -11, -5, 1, 7]) spots.push({ x: outer, y: WING.upper + 1.2, z, rot: face });
    for (const x of [s * 29, s * 19]) {
      spots.push({ x, y: 1.2, z: WING.z1 - HALF, rot: NORTH });
      spots.push({ x, y: 1.2, z: WING.z0 + HALF, rot: 0 });
    }
  }
  const panes: Pane[] = [];
  const frames: Placement[] = [];
  for (const p of spots) {
    const nx = Math.sin(p.rot);
    const nz = Math.cos(p.rot);
    // The kit's frame lies across x as it comes: a quarter turn less to stand in a wall facing `rot`.
    frames.push({ piece: 'lobby_p2_Window', x: p.x + nx * 0.12, y: p.y, z: p.z + nz * 0.12, rot: p.rot - Math.PI / 2, sx: 1, sy: 1, sz: 1 });
    panes.push({ x: p.x + nx * 0.03, y: p.y + 0.98, z: p.z + nz * 0.03, rot: p.rot, w: 1.05, h: 1.65 });
  }
  return { panes, frames };
}

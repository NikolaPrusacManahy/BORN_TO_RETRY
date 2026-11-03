// Update 0.3.21 — the manor's walls (spots.ts; MD/LOBBY_MANOR_PLAN.md): each a line of the dungeon kit's 2 m bricks
// (centred on the line between the rooms it parts), some rows high, capped, with its openings: the main gate's in the
// north wall, the arch from the great hall into each wing's south room, the doorway from each landing into the
// bestiary, the arch between each wing's two ground-floor rooms. The same lines give the look (bricks and caps) and the
// collision (a box per brick column, broken where it opens), so you bump into what you see; and the dark cores outside
// the outer walls (no seam shows the void). Pure.
import type { ArenaBox } from '../arena';
import type { Placement } from '../dungeon/dressing';
import { BRICK, GATE, HALL, LANDING_DOOR_Z, WALL_DEPTH, WING, WING_ARCH_Z } from './spots';

export const WALL = 'kit_p1_Wall_Modular';
export const CAP = 'kit_p1_WallCover_Modular';

/** A wall: along x (at a fixed z) or along z (at a fixed x), from end to end (m, a whole number of bricks), so many
 *  rows high from `base`, its face turned `face` (0: south), and its openings (along it, which rows). */
export interface WallLine {
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  rows: number;
  base?: number;
  face: number;
  gaps?: { from: number; to: number; rows: [number, number] }[];
  /** No cap: it ends under a floor (the wall between a wing's two rooms, under the bestiary). */
  open?: boolean;
}

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const NORTH = Math.PI;
const SOUTH = 0;
/** A cap's height (the roof rests on them). */
export const CAP_H = 0.43;

const opened = (l: WallLine, along: number, row: number) => (l.gaps ?? []).some((g) => along > g.from && along < g.to && row >= g.rows[0] && row < g.rows[1]);

/** Its bricks and caps (a cap on each column whose top row stands). */
export function wallPieces(l: WallLine, out: Placement[]) {
  const base = l.base ?? 0;
  for (let a = l.from + BRICK / 2; a < l.to; a += BRICK) {
    const [x, z] = l.axis === 'x' ? [a, l.at] : [l.at, a];
    for (let r = 0; r < l.rows; r++) if (!opened(l, a, r)) out.push({ piece: WALL, x, y: base + r * BRICK, z, rot: l.face, sx: 1, sy: 1, sz: 1 });
    if (!l.open) out.push({ piece: CAP, x, y: base + l.rows * BRICK, z, rot: l.face, sx: 1, sy: 1, sz: 1 });
  }
}

/** Its collision: each brick column's standing rows as boxes (a column's run up to its cap, broken by its openings; a
 *  full-height wall's on up into the roof). */
export function wallBoxes(l: WallLine): ArenaBox[] {
  const top = l.rows * BRICK >= HALL.wallH ? HALL.wallTop : (l.base ?? 0) + l.rows * BRICK;
  const base = l.base ?? 0;
  const out: ArenaBox[] = [];
  for (let a = l.from + BRICK / 2; a < l.to; a += BRICK) {
    let r0 = -1;
    for (let r = 0; r <= l.rows; r++) {
      const stands = r < l.rows && !opened(l, a, r);
      if (stands && r0 < 0) r0 = r;
      if (!stands && r0 >= 0) {
        const y0 = base + r0 * BRICK;
        const y1 = r === l.rows ? Math.max(base + r * BRICK, top) : base + r * BRICK;
        const [w, d] = l.axis === 'x' ? [BRICK, WALL_DEPTH] : [WALL_DEPTH, BRICK];
        const [x, z] = l.axis === 'x' ? [a, l.at] : [l.at, a];
        out.push({ x, y: (y0 + y1) / 2, z, w, h: y1 - y0, d, kind: 'wall' });
        r0 = -1;
      }
    }
  }
  return out;
}

/** Every wall of the manor. */
export function manorWalls(): WallLine[] {
  const { halfW: w, halfD: d } = HALL;
  const rows = HALL.wallH / BRICK;
  const lower = WING.upper / BRICK;
  const lines: WallLine[] = [
    // The north wall, across the hall and both wings: open for the gate's arch (the row over it stands).
    { axis: 'x', at: -d, from: -WING.x1, to: WING.x1, rows, face: SOUTH, gaps: [{ from: -GATE.archHalfW, to: GATE.archHalfW, rows: [0, rows - 1] }] },
    { axis: 'x', at: d, from: -w, to: w, rows, face: NORTH },
  ];
  for (const s of [-1, 1]) {
    const face = s < 0 ? EAST : WEST;
    // The hall's side wall: the arch into the wing's south room, the landing's doorway upstairs.
    lines.push({
      axis: 'z',
      at: s * w,
      from: -d,
      to: d,
      rows,
      face,
      gaps: [
        { from: WING_ARCH_Z - BRICK, to: WING_ARCH_Z + BRICK, rows: [0, 2] },
        { from: LANDING_DOOR_Z - BRICK / 2, to: LANDING_DOOR_Z + BRICK / 2, rows: [lower, rows] },
      ],
    });
    // The wing's outer wall and its south wall; the wall between its two rooms (the ground floor's, an arch in it).
    lines.push({ axis: 'z', at: s * WING.x1, from: WING.z0, to: WING.z1, rows, face });
    const [x0, x1] = s < 0 ? [-WING.x1, -WING.x0] : [WING.x0, WING.x1];
    lines.push({ axis: 'x', at: WING.z1, from: x0, to: x1, rows, face: NORTH });
    const mid = (x0 + x1) / 2;
    lines.push({ axis: 'x', at: WING.split, from: x0, to: x1, rows: lower, face: SOUTH, open: true, gaps: [{ from: mid - BRICK, to: mid + BRICK, rows: [0, 2] }] });
  }
  return lines;
}

/** The dark cores outside the outer walls, under the floors (as the dungeon's: no seam opens on the void), and behind
 *  the gate's arch. */
export function manorCores(): ArenaBox[] {
  const { halfW: w, halfD: d, wallH } = HALL;
  const top = wallH - 0.02;
  const t = WALL_DEPTH / 2 - 0.02;
  const g = GATE.halfW + 0.1;
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): ArenaBox => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: y1 - y0, d: z1 - z0, kind: 'wall' });
  const out = [
    box(-WING.x1 - 2, -0.5, -d - 2, -g, top, -d - t),
    box(g, -0.5, -d - 2, WING.x1 + 2, top, -d - t),
    box(-g, GATE.height + 0.1, -d - 2, g, top, -d - t),
    box(-w - 2, -0.5, d + t, w + 2, top, d + 2),
    // Under the floors, up to the portcullis.
    box(-WING.x1 - 2, -1, GATE.barsZ, WING.x1 + 2, -0.27, d + 2),
  ];
  // Each side: outside the wing's outer wall; south of the wing, outside the hall's side wall.
  const span = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];
  for (const s of [-1, 1]) {
    const [o0, o1] = span(s * (WING.x1 + t), s * (WING.x1 + 2));
    out.push(box(o0, -0.5, -d - 2, o1, top, WING.z1 + 2));
    const [h0, h1] = span(s * (w + t), s * (WING.x1 + 2));
    out.push(box(h0, -0.5, WING.z1 + t, h1, top, d + 2));
  }
  return out;
}

// Update 0.3.34 — floor 8's boss arena once Yokai : Okami's show is over (the designer: "The remaining island shift and
// merge with the combat arena, becoming a walkable surface once crashed into the arena, making this a very dynamic
// looking arena with bits of island"; "3 temples fall from the sy and blocks the exit gate"): where each of the sky's
// islands (engine/shrine/shrineSky.ts) ends up in the Great Shrine, sunk in, its top a mound you walk up (terraces a
// step high: under BODY.stepHeight), what stands on it (its piece, its sakura); Okami's own the biggest, off toward the
// wooden gate; the three temples across the doorway you came in by; where you stand when the show ends, and where it
// lands. Their boxes are gates (assemble.ts): no collision till the show's over (roomLoop.ts shuts them), then solid
// for good; the boss room's walk grid has them from the start. Laid out in the arena's own frame (`fwd`: in from the
// doorway you came in by; `right`: across), clear of the middle, of the way to the wooden gate and of the way in. Pure.
import type { Arena, ArenaBox } from '../arena';
import type { BossLayout } from './assemble';
import { pieceBlocks, SHRINE_KIT, ShrinePiece, ShrinePieceKind } from './shrine';

/** A terrace this high (m: under the 0.4 you step up); a mound's top this much of its foot's width. */
export const ISLE_STEP = 0.35;
const TOP_SHARE = 0.6;
/** A trunk's block (m: across, high). */
const TRUNK: readonly [number, number] = [0.7, 5];

export interface IsleTree {
  x: number;
  z: number;
  name: string;
  turn: number;
}

export interface Isle {
  /** Its sky island (shrineSky.ts's ISLANDS); Okami's own? */
  sky: number;
  main: boolean;
  /** Its middle (m), its foot's radius, its top's height. */
  x: number;
  z: number;
  r: number;
  top: number;
  /** What stands on it (null: nothing but its trees). */
  piece: ShrinePiece | null;
  trees: IsleTree[];
  /** Its terraces (each a ring a step up, two squares turned an eighth apart), what stands on it; their gates. */
  boxes: ArenaBox[];
  gates: number[];
}

export interface Temple {
  name: string;
  x: number;
  z: number;
  turn: number;
  s: number;
  box: ArenaBox;
  gate: number;
}

export interface OkamiArena {
  isles: Isle[];
  temples: Temple[];
  /** Where you stand as the show ends (facing in), and where it lands from its leap. */
  safe: { x: number; z: number; yaw: number };
  landing: { x: number; z: number };
  fwd: { x: number; z: number };
  right: { x: number; z: number };
}

/** Each island: its sky island, where (m along `fwd`, across), its foot's radius, how many terraces, its piece (kind,
 *  scale) and its sakura (where on its top: a share of its top's radius, its turn). Okami's first. */
const PLAN: readonly { sky: number; f: number; a: number; r: number; steps: number; piece: [ShrinePieceKind, number] | null; trees: [number, number][] }[] = [
  { sky: 2, f: 24, a: -28, r: 12, steps: 6, piece: ['hall', 0.75], trees: [[0.85, 2.4], [0.85, 4]] },
  { sky: 0, f: 30, a: 30, r: 9, steps: 4, piece: ['pagoda', 0.72], trees: [[0.8, 3.6]] },
  { sky: 1, f: -2, a: 42, r: 7, steps: 3, piece: ['torii', 0.8], trees: [[0.7, 1.2]] },
  { sky: 3, f: 2, a: -44, r: 6.5, steps: 3, piece: null, trees: [[0, 0], [0.75, 2.2]] },
  { sky: 4, f: -30, a: -38, r: 8, steps: 4, piece: ['pagoda', 0.62], trees: [[0.8, 0.8]] },
  { sky: 5, f: -26, a: 36, r: 7, steps: 3, piece: null, trees: [[0, 0], [0.7, 2.4], [0.7, 4.6]] },
  { sky: 6, f: -44, a: 46, r: 6, steps: 2, piece: ['bell', 0.9], trees: [] },
];
/** The three temples across the doorway you came in by (m in from its wall, across; kit piece, scale). */
const TEMPLES: readonly { f: number; a: number; kind: ShrinePieceKind; s: number }[] = [
  { f: 7, a: 0, kind: 'hall', s: 0.7 },
  { f: 6, a: -11, kind: 'pagoda', s: 0.6 },
  { f: 6, a: 11, kind: 'pagoda', s: 0.6 },
];
/** You stand this far in from that wall as the show ends; it lands this far in. */
const SAFE_IN = 24;
const LANDING_IN = 52;
const KIT: Record<ShrinePieceKind, string> = { torii: SHRINE_KIT.torii, hall: SHRINE_KIT.hall, pagoda: SHRINE_KIT.pagoda, bell: SHRINE_KIT.bell };

/** The arena's frame: in from the doorway you came in by, and across. */
export function arenaFrame(boss: BossLayout) {
  const e = boss.entrance;
  const fwd = { x: e === 'w' ? 1 : e === 'e' ? -1 : 0, z: e === 'n' ? 1 : e === 's' ? -1 : 0 };
  return { fwd, right: { x: -fwd.z, z: fwd.x } };
}

/** Its arena as the show leaves it; every box goes into `gates` and the boss room's arena (`walk`). */
export function okamiArenaOf(boss: BossLayout, gates: ArenaBox[], walk: Arena): OkamiArena {
  const { fwd, right } = arenaFrame(boss);
  const e = boss.end;
  const mx = (e.min.x + e.max.x) / 2;
  const mz = (e.min.z + e.max.z) / 2;
  const half = Math.max(e.max.x - e.min.x, e.max.z - e.min.z) / 2;
  const at = (f: number, a: number) => ({ x: mx + fwd.x * f + right.x * a, z: mz + fwd.z * f + right.z * a });
  // (Facing the middle: a turn about y, its front (+z) toward it.)
  const facing = (x: number, z: number) => Math.atan2(mx - x, mz - z);
  const take = (boxes: ArenaBox[]) =>
    boxes.map((b) => {
      walk.boxes.push(b);
      return gates.push(b) - 1;
    });
  const isles = PLAN.map((p, i): Isle => {
    const c = at(p.f, p.a);
    const top = p.steps * ISLE_STEP;
    const boxes = terraces(c.x, c.z, p.r, p.steps);
    const topR = p.r * TOP_SHARE;
    const turn = facing(c.x, c.z);
    let piece: ShrinePiece | null = null;
    if (p.piece) {
      const [kind, s] = p.piece;
      piece = { kind, x: c.x, z: c.z, w: 0, d: 0, turn: kind === 'torii' ? turn + Math.PI / 2 : turn, s, room: boss.room };
      for (const b of pieceBlocks(piece)) boxes.push({ ...b, y: b.y + top });
    }
    const trees = p.trees.map(([out, ang], k): IsleTree => {
      const tx = c.x + Math.cos(ang) * out * topR;
      const tz = c.z + Math.sin(ang) * out * topR;
      boxes.push({ x: tx, y: top + TRUNK[1] / 2, z: tz, w: TRUNK[0], h: TRUNK[1], d: TRUNK[0], kind: 'block' });
      return { x: tx, z: tz, name: SHRINE_KIT.sakura[(i * 3 + k * 4) % SHRINE_KIT.sakura.length], turn: ang * 2 + i };
    });
    return { sky: p.sky, main: i === 0, x: c.x, z: c.z, r: p.r, top, piece, trees, boxes, gates: take(boxes) };
  });
  const temples = TEMPLES.map((t): Temple => {
    const c = at(-half + t.f, t.a);
    const piece: ShrinePiece = { kind: t.kind, x: c.x, z: c.z, w: 0, d: 0, turn: Math.atan2(fwd.x, fwd.z), s: t.s, room: boss.room };
    const box = pieceBlocks(piece)[0];
    return { name: KIT[t.kind], x: c.x, z: c.z, turn: piece.turn, s: t.s, box, gate: take([box])[0] };
  });
  const s = at(-half + SAFE_IN, 0);
  return { isles, temples, safe: { ...s, yaw: Math.atan2(-fwd.x, -fwd.z) }, landing: at(-half + LANDING_IN, 0), fwd, right };
}

/** A mound of terraces at (x, z): `steps` rings, each a step up and a little narrower, from `r` at its foot. */
function terraces(x: number, z: number, r: number, steps: number): ArenaBox[] {
  const out: ArenaBox[] = [];
  const turned: [number, number, number, number] = [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)];
  for (let k = 0; k < steps; k++) {
    const rk = r * (1 - (1 - TOP_SHARE) * (steps > 1 ? k / (steps - 1) : 1));
    const h = (k + 1) * ISLE_STEP;
    // (Two squares an eighth of a turn apart: an octagon. 0.83: its side's share of the radius, its corners inside it.)
    const side = 2 * rk * 0.83;
    out.push({ x, y: h / 2, z, w: side, h, d: side, kind: 'block' }, { x, y: h / 2, z, w: side, h, d: side, kind: 'block', quat: turned });
  }
  return out;
}

/** The kit's piece for a shrine piece kind. */
export const kitOf = (kind: ShrinePieceKind) => KIT[kind];

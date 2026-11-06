// Update 0.3.62 — what the Big Shark has that no other enemy does (the Boss Design Bible, "The arena is a weapon"; spec
// MD_UPDATES/U0362_BIG_SHARK_BIBLE.md): the sunken ships in its arena, the anchors hanging over it, the whirlpool it stirs, the blood you
// leave in the water, the holes it's smashed. Pure.
import { BIG_SHARK } from '../../tuning/bigShark';
import type { Arena } from '../../world/arena';

export interface Hull {
  x: number;
  z: number;
  w: number;
  d: number;
  top: number;
}

export interface Anchor {
  x: number;
  z: number;
  /** Its chain's been shot, or it's been broken: it's gone. */
  gone: boolean;
  /** Falling since (s; −1: hanging). */
  falling: number;
}

export interface Hole {
  x: number;
  y: number;
  z: number;
}

export interface SharkBody {
  hulls: Hull[];
  anchors: Anchor[];
  /** The one its Abyss Jaws is under (−1: none), and its chain open to a hit, and hit. */
  marked: number;
  chainOpen: boolean;
  chainHit: boolean;
  /** Its whirlpool: where, seconds left (0: none), its warning left. */
  whirlX: number;
  whirlZ: number;
  whirlFor: number;
  whirlTell: number;
  /** Your blood in the water: seconds left, your hits it last counted (−1: not yet), and how long you've stayed at this spot. */
  bleed: number;
  hitsSeen: number;
  stillX: number;
  stillZ: number;
  stillFor: number;
  /** Where it smashed through, and till the next wreckage comes down in phase 2 (s). */
  holes: Hole[];
  wreckIn: number;
  /** Its arena's been read (its ships, its anchors). */
  set: boolean;
}

export const createSharkBody = (): SharkBody => ({ hulls: [], anchors: [], marked: -1, chainOpen: false, chainHit: false, whirlX: 0, whirlZ: 0, whirlFor: 0, whirlTell: 0, bleed: 0, hitsSeen: -1, stillX: 0, stillZ: 0, stillFor: 0, holes: [], wreckIn: 0, set: false });

/** Anchors hang this far out from its middle along each diagonal (m). */
const ANCHOR_OUT = 15;
/** A block this tall or more (m), this big, is a hull; and an anchor keeps this clear of one (m). */
const HULL_TALL = 2;
const HULL_WIDE = 6;
const CLEAR = 1;

/** Its arena read: the ships in it (the big blocks in its room) and four anchors, off the ships, round its middle. */
export function setSharkArena(b: SharkBody, arena: Pick<Arena, 'boxes'>, x: number, z: number, half: number) {
  b.set = true;
  b.hulls = [];
  for (const q of arena.boxes) {
    if (q.kind === 'floor' || q.kind === 'wall' || q.h < HULL_TALL || Math.max(q.w, q.d) < HULL_WIDE) continue;
    if (Math.abs(q.x - x) > half || Math.abs(q.z - z) > half) continue;
    b.hulls.push({ x: q.x, z: q.z, w: q.w, d: q.d, top: q.y + q.h / 2 });
  }
  b.anchors = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    let ax = x + sx * ANCHOR_OUT;
    let az = z + sz * ANCHOR_OUT;
    for (const h of b.hulls) {
      if (Math.abs(ax - h.x) > h.w / 2 + CLEAR || Math.abs(az - h.z) > h.d / 2 + CLEAR) continue;
      // (Off the ship: out along z.)
      az = h.z + Math.sign(az - h.z || 1) * (h.d / 2 + CLEAR + 1);
    }
    b.anchors.push({ x: ax, z: az, gone: false, falling: -1 });
    ax = 0;
  }
}

/** The nearest point of its ships to (x, z), within `far` (m). False: none. */
export function nearestHull(b: SharkBody, x: number, z: number, far: number, out: { x: number; y: number; z: number }): boolean {
  let best = far;
  let found = false;
  for (const h of b.hulls) {
    const px = Math.max(h.x - h.w / 2, Math.min(h.x + h.w / 2, x));
    const pz = Math.max(h.z - h.d / 2, Math.min(h.z + h.d / 2, z));
    const d = Math.hypot(px - x, pz - z);
    if (d > best) continue;
    best = d;
    found = true;
    out.x = px;
    out.y = Math.min(h.top, BIG_SHARK.v.floodTop) * 0.5;
    out.z = pz;
  }
  return found;
}

/** The anchor still hanging nearest (x, z) (−1: none); none left, they're all hung again. */
export function nearestAnchor(b: SharkBody, x: number, z: number): number {
  if (b.anchors.length > 0 && b.anchors.every((a) => a.gone)) {
    for (const a of b.anchors) {
      a.gone = false;
      a.falling = -1;
    }
  }
  let best = -1;
  let far = Infinity;
  b.anchors.forEach((a, i) => {
    const d = Math.hypot(a.x - x, a.z - z);
    if (!a.gone && d < far) [best, far] = [i, d];
  });
  return best;
}

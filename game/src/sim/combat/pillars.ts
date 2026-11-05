// Update 0.3.9 (the designer: "when the humanoid monster is pinned there [a pillar], another animation is played … the
// enemy go through the pillar and it breaks the pillar … Not just that kind of pillar, anything that looks like this
// kind of fixed architecture") — the floor's pillars: every column, whatever the floor's look
// (world/dungeon/assemble.ts). Which one a pinned body hangs on; one the pillar finisher breaks (execPin.ts): it snaps in
// two, its upper half falling the way the body was punched, as far as there's room before a wall (the view:
// engine/pillarBreak.ts).
// Update 0.3.10 (the designer: "fix collision with pillar") — broken, its box gives way to the stump's (as high as the
// break) and its upper half's where it lies: you stand on the one and bump into the other (engine/run.ts swaps the
// colliders; the floor's own box is left as it was, for the next run on it), enemies walk round it (their grids keep
// it). A body pinned to a pillar hangs against its stone. Pure.
// Update 0.3.29 — the Moon's boss, Tidebreaker (the designer: "full destructions, maybe they can grab a pillar"): a pillar
// torn out whole (its stump left, the rest in its hands: `uprootPillar`), every pillar near a quake or a landing snapped
// away from it (`breakAround`), one its shell rolls into; anything with the pillars, the walk grids and the events can.
import type { Vector3 } from 'three';
import type { Arena, ArenaBox } from '../../world/arena';
import { addWall, freeAt } from '../../world/navGrid';
import type { CombatState } from './state';

/** What breaking a pillar works with (the fight's state; an enemy's world with them). */
export type PillarWorld = Pick<CombatState, 'pillars' | 'nav' | 'flow' | 'events'>;
/** The pillars an enemy's world has (none but in the fight's). */
export const pillarsIn = (w: object): Pillar[] => (w as Partial<PillarWorld>).pillars ?? [];

export interface Pillar {
  /** Its middle on the floor, half its side (m), its height (m), its box (the floor's). */
  x: number;
  z: number;
  half: number;
  h: number;
  box: ArenaBox | null;
  /** Broken: the way it fell (yaw), and the floor it had to fall on (m); where its upper half lies (its snapped end,
   *  and the way it runs from there); the stump's box and that half's. */
  broken: boolean;
  yaw: number;
  room: number;
  lie: { x: number; z: number; yaw: number };
  stump: ArenaBox | null;
  top: ArenaBox | null;
}

/** Where it snaps: this share of its height (the designer: "break in half": in two, where the body is driven through it,
 *  below your eye: snapped any higher, its stump hid the body flying on and bursting at the wall); how far off its side
 *  a body may hang and still be on it (m). */
export const PILLAR_CUT = 0.25;
const ON = 0.15;
/** Its stone's radius (m: the stacked stone's, the plain column's shaft over its base), and the floor its fallen half
 *  leaves between it and the stump (m). */
export const STONE = 0.5;
const GAP = 0.25;

export const pillarsOf = (arena: Arena): Pillar[] =>
  (arena.pillars ?? []).map((p) => ({ x: p.x, z: p.z, half: p.half, h: p.h, box: p.box >= 0 ? (arena.boxes[p.box] ?? null) : null, broken: false, yaw: 0, room: 0, lie: { x: 0, z: 0, yaw: 0 }, stump: null, top: null }));

/** The pillar (whole) whose side `at` is on (−1: none). */
export function pillarAt(state: CombatState, at: Vector3): number {
  return state.pillars.findIndex((p) => !p.broken && Math.abs(at.x - p.x) <= p.half + ON && Math.abs(at.z - p.z) <= p.half + ON && at.y <= p.h);
}

/** `at`, on pillar `p`'s side, brought onto its stone (the same way out from its middle, the same height). */
export function onStone(p: Pillar, at: Vector3) {
  const dx = at.x - p.x;
  const dz = at.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  at.x = p.x + (dx / d) * STONE;
  at.z = p.z + (dz / d) * STONE;
}

/** Pillar `i` broken, its upper half falling along `yaw` with `room` m of floor before a wall: where it lies (along that
 *  way, or across it with no room), the stump's box as high as the break, the upper half's box, the walk grids. */
export function breakPillar(state: PillarWorld, i: number, yaw: number, room: number) {
  const p = state.pillars[i];
  p.broken = true;
  p.yaw = yaw;
  p.room = room;
  const cut = p.h * PILLAR_CUT;
  const len = p.h - cut;
  const across = room < STONE + GAP + len;
  p.lie.yaw = across ? yaw + Math.PI / 2 : yaw;
  const lx = -Math.sin(p.lie.yaw);
  const lz = -Math.cos(p.lie.yaw);
  const out = STONE * (across ? 2 : 1) + GAP;
  p.lie.x = p.x - Math.sin(yaw) * out - (across ? (lx * len) / 2 : 0);
  p.lie.z = p.z - Math.cos(yaw) * out - (across ? (lz * len) / 2 : 0);
  p.stump = p.box ? { ...p.box, y: cut / 2, h: cut } : null;
  const top: ArenaBox = { x: p.lie.x + (lx * len) / 2, y: STONE, z: p.lie.z + (lz * len) / 2, w: Math.abs(lx) * len + Math.abs(lz) * 2 * STONE, h: 2 * STONE, d: Math.abs(lz) * len + Math.abs(lx) * 2 * STONE, kind: 'block' };
  p.top = top;
  // (Walkers go round it; fliers pass over.)
  const f = { minX: top.x - top.w / 2, maxX: top.x + top.w / 2, minZ: top.z - top.d / 2, maxZ: top.z + top.d / 2 };
  addWall(state.nav.small, f);
  addWall(state.nav.large, f);
  state.flow.small.target = state.flow.large.target = -1;
  state.events.push('pillarBreak', i, p.x, cut, p.z);
}

/** Update 0.3.29 — pillar `i` torn out whole: its stump left as high as a break's, the rest carried off (no top lies). */
export function uprootPillar(state: PillarWorld, i: number) {
  const p = state.pillars[i];
  p.broken = true;
  p.stump = p.box ? { ...p.box, y: (p.h * PILLAR_CUT) / 2, h: p.h * PILLAR_CUT } : null;
  p.top = null;
  state.events.push('pillarGrab', i, p.x, p.h * PILLAR_CUT, p.z);
}

/** Update 0.3.49 — the first pillar standing on the line from (ax, az) to (bx, bz) (−1: none), its sides counted this far
 *  out (m): the Dragon's blast, stopped by one. */
export function pillarBetween(pillars: readonly Pillar[], ax: number, az: number, bx: number, bz: number, margin: number): number {
  let best = -1;
  let first = Infinity;
  pillars.forEach((p, i) => {
    if (p.broken) return;
    const r = p.half + margin;
    // Where the line is inside the pillar's square (a share of the way along it).
    let from = 0;
    let to = 1;
    for (const [start, delta, mid] of [
      [ax, bx - ax, p.x],
      [az, bz - az, p.z],
    ]) {
      if (Math.abs(delta) < 1e-6) {
        if (Math.abs(start - mid) > r) to = -1;
        continue;
      }
      const t0 = (mid - r - start) / delta;
      const t1 = (mid + r - start) / delta;
      from = Math.max(from, Math.min(t0, t1));
      to = Math.min(to, Math.max(t0, t1));
    }
    if (from <= to && from < first) [best, first] = [i, from];
  });
  return best;
}

/** The nearest pillar standing within `max` of (x, z) (−1: none). */
export function standingNear(state: Pick<PillarWorld, 'pillars'>, x: number, z: number, max: number): number {
  let best = -1;
  let bd = max;
  state.pillars.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.z - z);
    if (!p.broken && d <= bd) [best, bd] = [i, d];
  });
  return best;
}

/** Floor along `yaw`'s fall (−sin, −cos) from (x, z) before a wall, up to `max` (m). */
export function floorAhead(state: Pick<PillarWorld, 'nav'>, x: number, z: number, yaw: number, max = 8): number {
  const dx = -Math.sin(yaw);
  const dz = -Math.cos(yaw);
  let d = STONE + GAP;
  while (d < max && freeAt(state.nav.small, x + dx * d, z + dz * d)) d += 0.5;
  return d;
}

/** Pillar `i` snapped, falling along `yaw` (as far as the floor lets it). */
export const snapPillar = (state: PillarWorld, i: number, yaw: number) => breakPillar(state, i, yaw, floorAhead(state, state.pillars[i].x, state.pillars[i].z, yaw));

/** Every pillar standing within `r` of (x, z) snapped, each falling away from it; how many. */
export function breakAround(state: PillarWorld, x: number, z: number, r: number): number {
  let n = 0;
  state.pillars.forEach((p, i) => {
    if (p.broken || Math.hypot(p.x - x, p.z - z) > r) return;
    snapPillar(state, i, Math.atan2(-(p.x - x), -(p.z - z)));
    n++;
  });
  return n;
}

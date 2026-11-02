// Update 0.3.9 (the designer: "when the humanoid monster is pinned there [a pillar], another animation is played … the
// enemy go through the pillar and it breaks the pillar … Not just that kind of pillar, anything that looks like this
// kind of fixed architecture") — the floor's pillars: every column, whatever the floor's look
// (world/dungeon/assemble.ts). Which one a pinned body hangs on; one the pillar finisher breaks (execPin.ts): it snaps in
// half, its upper half falling the way the body was punched, as far as there's room before a wall (the view:
// engine/pillarBreak.ts). Its collision stays: the stump still stands where it stood. Pure.
import type { Vector3 } from 'three';
import type { Arena } from '../../world/arena';
import type { CombatState } from './state';

export interface Pillar {
  /** Its middle on the floor, half its side (m), its height (m). */
  x: number;
  z: number;
  half: number;
  h: number;
  /** Broken (its upper half lies on the floor): the way it fell (yaw), and the floor it had to fall on (m). */
  broken: boolean;
  yaw: number;
  room: number;
}

/** Where it snaps: this share of its height (the designer: "break in half": in two, where the body is driven through it,
 *  below your eye: snapped any higher, its stump hid the body flying on and bursting at the wall); how far off its side
 *  a body may hang and still be on it (m). */
export const PILLAR_CUT = 0.25;
const ON = 0.15;

export const pillarsOf = (arena: Arena): Pillar[] => (arena.pillars ?? []).map((p) => ({ ...p, broken: false, yaw: 0, room: 0 }));

/** The pillar (whole) whose side `at` is on (−1: none). */
export function pillarAt(state: CombatState, at: Vector3): number {
  return state.pillars.findIndex((p) => !p.broken && Math.abs(at.x - p.x) <= p.half + ON && Math.abs(at.z - p.z) <= p.half + ON && at.y <= p.h);
}

/** Pillar `i` broken, its upper half falling along `yaw` with `room` m of floor before a wall. */
export function breakPillar(state: CombatState, i: number, yaw: number, room: number) {
  const p = state.pillars[i];
  p.broken = true;
  p.yaw = yaw;
  p.room = room;
  state.events.push('pillarBreak', i, p.x, p.h * PILLAR_CUT, p.z);
}

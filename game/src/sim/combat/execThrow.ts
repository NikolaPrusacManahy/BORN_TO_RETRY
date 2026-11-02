// Update 0.3.8 — where an executed body is thrown (moved out of execution.ts, which had grown past 300 lines): the
// nearest wall round you, for one thrown at it; where it lands, thrown ahead short of the first wall or at that wall,
// and its flight. Pure.
// Update 0.3.9 — the pillar finisher's wall: the first straight ahead past the pillar (`wallPast`).
import { EXECUTION } from '../../tuning/execution';
import { wallBetween } from '../../world/navGrid';
import type { CombatState } from './state';
import type { Execution } from './execution';
import { ExecMove, heightOf } from './execMoves';
import { F } from './execPose';

/** How far (m) to look for a wall to throw at, in how many ways. */
const WALL_REACH = 16;
const WALL_WAYS = 16;

/** The nearest wall round you (within reach): the way to throw at it. */
export function findWall(state: CombatState, ex: Execution) {
  const g = state.nav.small;
  const x0 = ex.origin.x;
  const z0 = ex.origin.z;
  for (let w = 0; w < WALL_WAYS; w++) {
    const yaw = ex.yaw + (w / WALL_WAYS) * Math.PI * 2;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    if (!wallBetween(g, x0, z0, x0 + fx * WALL_REACH, z0 + fz * WALL_REACH)) continue;
    let lo = 0;
    let hi = WALL_REACH;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(g, x0, z0, x0 + fx * mid, z0 + fz * mid)) hi = mid;
      else lo = mid;
    }
    if (lo < ex.wall) {
      ex.wall = lo;
      ex.aimYaw = yaw;
    }
  }
}

/** Where it lands: thrown ahead, short of the first wall; or at the wall it was swung towards. Its flight (s in). */
export function throwTo(state: CombatState, ex: Execution, move: ExecMove) {
  const v = EXECUTION.v;
  F.set(-Math.sin(ex.aimYaw), 0, -Math.cos(ex.aimYaw));
  const x0 = ex.origin.x;
  const z0 = ex.origin.z;
  const atWall = move.end === 'wall' && ex.wall < Infinity;
  let len = atWall ? Math.max(1.5, ex.wall - 0.5) : v.throwDistance * (move.far ?? 1);
  if (!atWall && wallBetween(state.nav.small, x0, z0, x0 + F.x * len, z0 + F.z * len)) {
    let lo = 0;
    let hi = len;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(state.nav.small, x0, z0, x0 + F.x * mid, z0 + F.z * mid)) hi = mid;
      else lo = mid;
    }
    len = Math.max(1.5, lo - 0.8);
  }
  ex.land.set(x0 + F.x * len, ex.origin.y + (atWall ? 1.1 : heightOf(ex.kind) * 0.3), z0 + F.z * len);
  const share = atWall ? Math.max(0.35, Math.min(1.3, len / v.throwDistance)) : 1;
  ex.flight = Math.max(0.05, v.flight * (move.fly ?? 1) * share * Math.max(0.1, v.speed));
}

/** Update 0.3.9 — the first wall straight ahead (the way it's thrown) from `from` m on (past the pillar it goes
 *  through); none in reach, as far as that. */
export function wallPast(state: CombatState, ex: Execution, from: number) {
  const g = state.nav.small;
  F.set(-Math.sin(ex.aimYaw), 0, -Math.cos(ex.aimYaw));
  const x0 = ex.origin.x + F.x * from;
  const z0 = ex.origin.z + F.z * from;
  ex.wall = from + WALL_REACH;
  if (!wallBetween(g, x0, z0, x0 + F.x * WALL_REACH, z0 + F.z * WALL_REACH)) return;
  let lo = 0;
  let hi = WALL_REACH;
  for (let k = 0; k < 10; k++) {
    const mid = (lo + hi) / 2;
    if (wallBetween(g, x0, z0, x0 + F.x * mid, z0 + F.z * mid)) hi = mid;
    else lo = mid;
  }
  ex.wall = from + lo;
}

// Update 0.0.18 — what floor 2's walkers share: closing in on you round walls (straight when it can, stopping `stop` m
// off), keeping a ring round you (backing off when you're close, circling between), and an arc leap to a spot. Pure.
import { Vector3 } from 'three';
import { freeAt } from '../../world/navGrid';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, turn, walk, yawTo } from './enemy';
import type { SizeClass } from './kinds';

const way = new Vector3();
/** It looks this far ahead (m) before stepping back or sideways into a wall; seconds between turning round. */
const LOOK = 1;
const STRAFE_TIME = 2.5;

/** Comes at you on its grid; returns how ('none': no way to you). */
export function closeIn(e: Enemy, player: PlayerState, w: EnemyWorld, size: SizeClass, speed: number, stop: number, turnRate: number, dt: number): 'none' | 'straight' | 'path' {
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const how = chaseDir(w.flow[size], w.nav[size], e.pos, player.pos.x, player.pos.z, way);
  if (how === 'none') {
    e.facing = turn(e.facing, toward, turnRate * dt);
    return how;
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const step = how === 'straight' ? Math.min(speed * dt, Math.max(0, dist - stop)) : speed * dt;
  e.facing = turn(e.facing, how === 'straight' ? toward : Math.atan2(-way.x, -way.z), turnRate * dt);
  walk(e, way.x, way.z, step, w.nav[size]);
  return how;
}

/** Holds a ring round you: closer than `near` it backs off (unless a wall is behind it), otherwise circles. */
export function keepRing(e: Enemy, player: PlayerState, w: EnemyWorld, size: SizeClass, speed: number, near: number, turnRate: number, dt: number) {
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const dist = Math.max(1e-3, Math.hypot(dx, dz));
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), turnRate * dt);
  const ax = -dx / dist;
  const az = -dz / dist;
  const g = w.nav[size];
  if (dist < near && freeAt(g, e.pos.x + ax * LOOK, e.pos.z + az * LOOK)) {
    walk(e, ax, az, speed * dt, g);
    return;
  }
  e.strafeTime -= dt;
  const cx = -az * e.strafe;
  const cz = ax * e.strafe;
  if (e.strafeTime <= 0 || !freeAt(g, e.pos.x + cx * LOOK, e.pos.z + cz * LOOK)) {
    e.strafe = -e.strafe;
    e.strafeTime = STRAFE_TIME;
    return;
  }
  walk(e, cx, cz, speed * 0.55 * dt, g);
}

/** Along an arc from `e.from` to `e.aim` (`k`: 0..1 through it, `arc`: its height, m). */
export function arcTo(e: Enemy, k: number, arc: number) {
  e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
  e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
  e.pos.y = e.from.y + 4 * arc * k * (1 - k);
}

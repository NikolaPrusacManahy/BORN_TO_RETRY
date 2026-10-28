// Update 0.0.13 — what fliers share (the Stinger, the Wraith): keeping to their height, seeing you through the air (a
// ray from their middle to your chest: no wall, crate or gate in between), coming closer on their own grid (they go
// over low things), and circling you. Pure.
import { Vector3 } from 'three';
import { freeAt } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, turn, walk } from './enemy';
import { ENEMY_STATS } from './kinds';

/** How fast a flier climbs or sinks to its height (m/s), and turns (rad/s). */
const CLIMB = 4;
const TURN = 8;
/** Seconds between turning round while circling; how far ahead (m) it checks before circling into a wall. */
const STRAFE_TIME = 2.2;
const LOOK = 1.2;

const mid = new Vector3();
const to = new Vector3();
const way = new Vector3();

/** Its middle (the centre of its body) into `out`. */
export function middle(e: Enemy, out: Vector3): Vector3 {
  return out.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
}

/** Eases its height towards `alt` (m, under it). */
export function keepHeight(e: Enemy, alt: number, dt: number) {
  const d = alt - e.pos.y;
  e.pos.y += Math.sign(d) * Math.min(Math.abs(d), CLIMB * dt);
}

/** Nothing solid between its middle and your chest. */
export function seesInAir(e: Enemy, player: PlayerState, world: CollisionWorld): boolean {
  middle(e, mid);
  to.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(mid);
  const d = to.length();
  if (d < 1e-3) return true;
  return world.rayDistance(mid, to.divideScalar(d), d) >= d - 0.3;
}

/** Comes closer on its grid (round walls and columns, over the rest), facing the way it goes or you. */
export function flyCloser(e: Enemy, player: PlayerState, w: EnemyWorld, speed: number, toward: number, dt: number) {
  const how = chaseDir(w.flow.air, w.nav.air, e.pos, player.pos.x, player.pos.z, way);
  if (how === 'none') return;
  walk(e, way.x, way.z, speed * dt, w.nav.air);
  e.facing = turn(e.facing, how === 'straight' ? toward : Math.atan2(-way.x, -way.z), TURN * dt);
}

/** Circles you (turning round now and then, or at a wall), or backs away if you're closer than `near`. */
export function circle(e: Enemy, player: PlayerState, w: EnemyWorld, speed: number, near: number, toward: number, dt: number) {
  e.facing = turn(e.facing, toward, TURN * dt);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const dist = Math.max(1e-3, Math.hypot(dx, dz));
  const ax = -dx / dist;
  const az = -dz / dist;
  if (dist < near && freeAt(w.nav.air, e.pos.x + ax * LOOK, e.pos.z + az * LOOK)) {
    walk(e, ax, az, speed * dt, w.nav.air);
    return;
  }
  e.strafeTime -= dt;
  const cx = -az * e.strafe;
  const cz = ax * e.strafe;
  if (e.strafeTime <= 0 || !freeAt(w.nav.air, e.pos.x + cx * LOOK, e.pos.z + cz * LOOK)) {
    e.strafe = -e.strafe;
    e.strafeTime = STRAFE_TIME;
    return;
  }
  walk(e, cx, cz, speed * 0.6 * dt, w.nav.air);
}

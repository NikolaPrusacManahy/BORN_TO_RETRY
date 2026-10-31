// Update 0.2.11 — what floor 6's fish share (the designer: "enemies swims faster than you"): swimming in three
// dimensions, round walls and columns on the fliers' grid and over everything lower (they rise over it), never out of
// the water (its top: the fight's water level, CombatState.tide); circling you at your height, each its own way round;
// darting straight along a line, through you once; and their bodies floating up when they die (update.ts). Pure.
import { Vector3 } from 'three';
import { freeAt } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import { segmentDistance } from '../combat/geometry';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, turn, walk } from './enemy';
import { ENEMY_STATS } from './kinds';
import { fishLength } from './kinds6';

/** Out of the water (the Lab's other floors), they swim under this as if it were (m). */
const TOP = 6.5;
/** It keeps this far over whatever is under it (m); turns this fast (rad/s); climbs at this share of its speed; on its
 *  circle, aims this far round ahead (rad). A dead fish floats up this fast (m/s). */
const CLEAR = 0.3;
const TURN = 6;
const CLIMB = 0.8;
const LEAD = 0.6;
const FLOAT = 0.6;

const DOWN = new Vector3(0, -1, 0);
const from = new Vector3();
const way = new Vector3();
const mid = new Vector3();
const dir = new Vector3();
const next = new Vector3();
const a = new Vector3();
const b = new Vector3();

/** The water's top where the fight is (m). */
export const waterTop = (w: EnemyWorld) => (w.tide > 0 ? w.tide : TOP);

/** Your chest's height (m): where fish aim. */
export const chest = (player: PlayerState) => player.pos.y + AIM_HEIGHT;

/** How high whatever is under (x, z) reaches (m; the floor: 0). */
export function groundUnder(world: CollisionWorld, x: number, z: number, top: number): number {
  from.set(x, top, z);
  const d = world.rayDistance(from, DOWN, top + 1);
  return Number.isFinite(d) ? Math.max(0, top - d) : 0;
}

/** Eases its middle towards `y` (m), between what's under it and the water's top; never into what's under it. */
export function holdDepth(e: Enemy, y: number, speed: number, dt: number, w: EnemyWorld, world: CollisionWorld) {
  const h = ENEMY_STATS[e.kind]().height;
  const top = waterTop(w);
  const low = groundUnder(world, e.pos.x, e.pos.z, top) + CLEAR;
  const want = Math.max(low, Math.min(top - h, y - h / 2));
  const d = want - e.pos.y;
  e.pos.y += Math.sign(d) * Math.min(Math.abs(d), speed * CLIMB * dt);
  if (e.pos.y < low) e.pos.y = low;
}

/** Swims towards (x, z) at `speed`, round walls and columns, its middle towards `y`; faces the way it swims. Returns
 *  how far (flat) it still is. */
export function swimTo(e: Enemy, x: number, y: number, z: number, speed: number, dt: number, w: EnemyWorld, world: CollisionWorld): number {
  const dist = Math.hypot(x - e.pos.x, z - e.pos.z);
  if (dist > 1e-3 && chaseDir(w.flow.air, w.nav.air, e.pos, x, z, way) !== 'none') {
    walk(e, way.x, way.z, Math.min(speed * dt, dist), w.nav.air);
    e.facing = turn(e.facing, Math.atan2(-way.x, -way.z), TURN * dt);
  }
  holdDepth(e, y, speed, dt, w, world);
  return dist;
}

/** Circles you `ring` m off, its middle at your chest's height plus `dy`, its own way round (Enemy.strafe: it turns
 *  back at a wall). */
export function circleYou(e: Enemy, player: PlayerState, ring: number, dy: number, speed: number, dt: number, w: EnemyWorld, world: CollisionWorld) {
  const ang = Math.atan2(e.pos.z - player.pos.z, e.pos.x - player.pos.x) + e.strafe * LEAD;
  const x = player.pos.x + Math.cos(ang) * ring;
  const z = player.pos.z + Math.sin(ang) * ring;
  if (!freeAt(w.nav.air, x, z)) e.strafe = -e.strafe;
  swimTo(e, x, chest(player) + dy, z, speed, dt, w, world);
}

/** Its middle into `out`. */
export function fishMiddle(e: Enemy, out: Vector3): Vector3 {
  return out.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
}

/** Aims a dart: from its middle to `to`, then `past` m beyond it, kept off the floor. */
export function aimDart(e: Enemy, to: Vector3, past: number) {
  fishMiddle(e, e.from);
  dir.subVectors(to, e.from);
  const len = dir.length();
  e.aim.copy(to);
  if (len > 1e-4) e.aim.addScaledVector(dir, past / len);
  e.aim.y = Math.max(ENEMY_STATS[e.kind]().height / 2 + CLEAR, e.aim.y);
  e.struck = false;
}

/** Darts its middle along to Enemy.aim at `speed`: through you once (`hit` the first time its body meets yours),
 *  stopping at the end ('end') or at anything solid ('wall'); 'on' meanwhile. It faces the way it darts. */
export function dart(e: Enemy, player: PlayerState, speed: number, dt: number, world: CollisionWorld, hit: () => void): 'on' | 'end' | 'wall' {
  const s = ENEMY_STATS[e.kind]();
  const nose = Math.max(s.radius, fishLength(e.kind, s.height) / 2);
  fishMiddle(e, mid);
  dir.subVectors(e.aim, mid);
  const left = dir.length();
  const step = Math.min(left, speed * dt);
  if (left > 1e-4) dir.divideScalar(left);
  const wall = world.rayDistance(mid, dir, step + nose);
  const go = Math.min(step, Math.max(0, wall - nose));
  next.copy(mid).addScaledVector(dir, go);
  if (!e.struck) {
    a.set(player.pos.x, player.pos.y + BODY.radius, player.pos.z);
    b.set(player.pos.x, player.pos.y + BODY.height - BODY.radius, player.pos.z);
    if (segmentDistance(mid, next, a, b) <= s.radius + BODY.radius + nose * 0.5) {
      e.struck = true;
      hit();
    }
  }
  e.pos.set(next.x, next.y - s.height / 2, next.z);
  if (Math.abs(dir.x) + Math.abs(dir.z) > 1e-3) e.facing = Math.atan2(-dir.x, -dir.z);
  if (go < step - 1e-4) return 'wall';
  return left - go <= 1e-3 ? 'end' : 'on';
}

/** Is it in front of you within `deg` degrees (you looking at it)? */
export function inYourEyes(e: Enemy, player: PlayerState, deg: number): boolean {
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) return true;
  const dot = (-Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz) / len;
  return dot >= Math.cos((deg * Math.PI) / 180);
}

/** A dead fish floats up (belly up: the view turns it), to the water's top. */
export function floatUp(e: Enemy, _index: number, w: EnemyWorld, dt: number) {
  e.vel.y = 0;
  e.pos.y = Math.max(e.prev.y, Math.min(waterTop(w) - ENEMY_STATS[e.kind]().height, e.prev.y + FLOAT * dt));
}

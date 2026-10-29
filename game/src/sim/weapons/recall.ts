// Update 0.1.5 — the Gold Axe comes back (the designer: "can return to the player by holding right click, like Thor's
// hammer"). Thrown, it doesn't break: it drops where it hits something, sticks in the wall it meets, or falls when its
// flight runs out, and lies there. Right click held with your fists out calls it: it turns for your hand, speeding up,
// through walls, hitting everything it passes once, and you catch it (back into a weapon slot and your hand). Its last
// use spent on a throw, it breaks there as any weapon does. Pure.
import { Vector3 } from 'three';
import { CAMERA } from '../../tuning/camera';
import { WEAPONS } from '../../tuning/weapons';
import type { CollisionWorld } from '../collisionWorld';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../combat/strike';
import type { PlayerState } from '../player/state';
import { giveWeapon } from './slots';
import { holding, Thrown } from './weapons';

/** Close enough to your eye to be caught (m); how fast it falls once dropped (m/s²); it spins back (rad/s). */
const CATCH = 1;
const FALL = 20;
const SPIN = 22;
/** Falling this long without meeting a floor (into the dark), it comes back by itself (s). */
const LOST = 3;
/** It stops just short of what it sticks in (m). */
const SHORT = 0.06;
/** How close it must pass a target's capsule to hit it on the way back (m). */
const RADIUS = 0.4;

const DOWN = new Vector3(0, -1, 0);
const eye = new Vector3();
const dir = new Vector3();
const next = new Vector3();
const hit = emptyTargetHit();

/** Any of yours out there, to be called back. */
export function axeOut(state: CombatState): boolean {
  for (const t of state.thrown) if (t.alive && t.returns) return true;
  return false;
}

/** Right click held, fists out: every one of yours turns for your hand. */
export function callBack(state: CombatState) {
  for (const t of state.thrown) {
    if (!t.alive || !t.returns || t.phase === 'back') continue;
    t.phase = 'back';
    t.speed = 0;
    t.struckN = 0;
    state.events.push('recall', 0, t.pos.x, t.pos.y, t.pos.z);
  }
}

/** It hit something: one use; it drops there (its last use: it breaks, returns false). */
export function landed(t: Thrown, at: Vector3): boolean {
  t.uses = Math.max(0, t.uses - 1);
  if (t.uses === 0) return false;
  t.pos.copy(at);
  t.phase = 'drop';
  t.vel.set(t.vel.x * 0.1, 0, t.vel.z * 0.1);
  t.life = 0;
  return true;
}

/** It met a wall: it sticks there, head in. */
export function stick(state: CombatState, t: Thrown, at: Vector3, along: Vector3) {
  t.pos.copy(at).addScaledVector(along, -SHORT);
  t.phase = 'stuck';
  state.events.push('axeStick', 0, t.pos.x, t.pos.y, t.pos.z);
}

/** Its flight ran out: it falls. */
export function drop(t: Thrown) {
  t.phase = 'drop';
  t.life = 0;
}

/** Each tick, for one of yours that isn't flying out: falling, lying, or coming back. */
export function updateReturning(state: CombatState, t: Thrown, world: CollisionWorld, player: PlayerState, dt: number) {
  if (t.phase === 'stuck') return;
  if (t.phase === 'drop') {
    t.life += dt;
    t.vel.y -= FALL * dt;
    const step = -t.vel.y * dt;
    const floor = world.rayDistance(t.pos, DOWN, step + SHORT);
    if (floor <= step + SHORT) {
      t.pos.y -= Math.max(0, floor - SHORT);
      t.phase = 'stuck';
      state.events.push('axeStick', 1, t.pos.x, t.pos.y, t.pos.z);
      return;
    }
    t.pos.addScaledVector(t.vel, dt);
    if (t.life > LOST) callBack(state);
    return;
  }
  // Back to your hand.
  const v = WEAPONS.v;
  eye.set(player.pos.x, player.pos.y + CAMERA.v.eyeHeight, player.pos.z);
  t.speed = Math.min(v.axeReturnSpeed, t.speed + (v.axeReturnSpeed / Math.max(1e-3, v.axeReturnPull)) * dt);
  t.spin += SPIN * dt;
  dir.subVectors(eye, t.pos);
  const dist = dir.length();
  const step = t.speed * dt;
  if (dist <= Math.max(CATCH, step)) {
    t.alive = false;
    giveWeapon(state, holding(t.kind, t.uses), player.pos);
    state.events.push('catch', t.uses, eye.x, eye.y, eye.z);
    return;
  }
  dir.divideScalar(dist);
  t.vel.copy(dir).multiplyScalar(t.speed);
  next.copy(t.pos).addScaledVector(dir, step);
  if (nearestTarget(state, t.pos, next, RADIUS, hit)) {
    // Each thing once on the way back (dummies counted after the enemies).
    const id = hit.kind === 'enemy' ? hit.index : hit.kind === 'dummy' ? 1000 + hit.index : 2000 + hit.index;
    let seen = false;
    for (let i = 0; i < t.struckN; i++) if (t.struck[i] === id) seen = true;
    if (!seen && t.struckN < t.struck.length) {
      t.struck[t.struckN++] = id;
      landHit(state, hit, v.axeReturnDamage, v.throwKnock * 0.5, dir.x, dir.z, 'hitThrown', v.axeReturnDamage);
    }
  }
  t.pos.copy(next);
}

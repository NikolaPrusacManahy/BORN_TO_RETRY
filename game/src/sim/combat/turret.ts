// M1 step 6 — the orb turret: when it can see you and its cooldown is over, its head glows for the warning
// time, then it fires a slow orb at your chest. Every shot is warned first. Breaks like a dummy and comes back.
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { TARGETS } from '../../tuning/combat';
import type { CollisionWorld } from '../collisionWorld';
import { fireOrb } from './orbs';
import type { CombatEvent } from './state';
import { Orb, TARGET_SHAPES, Turret } from './targets';

/** Where on you the turret aims, above your feet (m). */
export const AIM_HEIGHT = 1.2;

const muzzle = new Vector3();
const toTarget = new Vector3();

/** Can the turret see a point `dist` away along `dir` from its muzzle? */
function canSee(world: CollisionWorld, from: Vector3, dir: Vector3, dist: number): boolean {
  return world.rayDistance(from, dir, dist) >= dist;
}

export function updateTurret(t: Turret, targetFeet: Vector3, world: CollisionWorld, orbs: Orb[], events: EventQueue<CombatEvent>, dt: number) {
  const v = TARGETS.v;
  t.flash = Math.max(0, t.flash - dt);
  if (t.broken) {
    t.respawn -= dt;
    if (t.respawn > 0) return;
    t.broken = false;
    t.hp = v.turretHp;
    t.cooldown = v.turretInterval;
    events.push('respawn', 1, t.pos.x, t.pos.y, t.pos.z);
    return;
  }
  muzzle.set(t.pos.x, t.pos.y + TARGET_SHAPES.turret.muzzleHeight, t.pos.z);
  toTarget.set(targetFeet.x, targetFeet.y + AIM_HEIGHT, targetFeet.z).sub(muzzle);
  const dist = toTarget.length();
  toTarget.divideScalar(Math.max(dist, 1e-6));
  // Shots and sight lines start just outside the head (a ray from inside its own collider would stop at once).
  const out = TARGET_SHAPES.turret.radius + v.orbRadius + 0.05;
  muzzle.addScaledVector(toTarget, out);

  if (t.telegraph > 0) {
    t.telegraph -= dt;
    if (t.telegraph > 0) return;
    t.telegraph = 0;
    t.cooldown = v.turretInterval;
    if (fireOrb(orbs, muzzle, toTarget, v.orbSpeed, v.orbDamage, 'turret')) events.push('orbFire', 0, muzzle.x, muzzle.y, muzzle.z);
    return;
  }
  if (t.cooldown > 0) {
    t.cooldown -= dt;
    return;
  }
  if (dist <= v.turretRange && canSee(world, muzzle, toTarget, dist - out)) {
    t.telegraph = v.turretTelegraph;
    events.push('telegraph', 0, muzzle.x, muzzle.y, muzzle.z);
  }
}

// M2 — thrown weapons in flight (design §6: breaking is a payoff). A thrown weapon flies in a flat arc, spinning; the
// first target it passes takes a big hit (and a hit-stop); a wall stops it. Either way it breaks.
// Update 0.1.5 — except a Gold Axe with uses left: it turns end over end, drops where it hits, sticks in a wall, and
// comes back when called (recall.ts).
import { Vector3 } from 'three';
import { FEEDBACK } from '../../tuning/combat';
import { WEAPONS } from '../../tuning/weapons';
import type { CollisionWorld } from '../collisionWorld';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../combat/strike';
import type { PlayerState } from '../player/state';
import { drop, landed, stick, updateReturning } from './recall';
import { THROWN_GRAVITY } from './weapons';

/** How close it must pass a target's capsule to hit it (m). */
export const THROWN_RADIUS = 0.35;

const next = new Vector3();
const dir = new Vector3();
const hit = emptyTargetHit();

export function updateThrown(state: CombatState, world: CollisionWorld, player: PlayerState, dt: number) {
  const v = WEAPONS.v;
  for (const t of state.thrown) {
    if (!t.alive) continue;
    if (t.phase !== 'fly') {
      updateReturning(state, t, world, player, dt);
      continue;
    }
    t.life -= dt;
    t.spin += (t.returns ? v.axeSpin : v.throwSpin) * dt;
    t.vel.y -= THROWN_GRAVITY * dt;
    next.copy(t.pos).addScaledVector(t.vel, dt);
    if (nearestTarget(state, t.pos, next, THROWN_RADIUS, hit)) {
      const flat = Math.hypot(t.vel.x, t.vel.z) || 1;
      const damage = t.returns ? v.axeThrowDamage * (1 + (v.axeChargeDamage - 1) * t.power) : v.throwDamage;
      landHit(state, hit, damage, v.throwKnock, t.vel.x / flat, t.vel.z / flat, 'hitThrown', damage);
      state.hitStop.request(FEEDBACK.v.stopHeavy);
      if (t.returns && landed(t, t.pos.lerp(next, hit.s))) continue;
      if (t.returns) state.events.push('weaponBroken');
      shatter(state, t.pos);
      t.alive = false;
      continue;
    }
    const step = t.pos.distanceTo(next);
    dir.subVectors(next, t.pos).divideScalar(Math.max(step, 1e-6));
    const wall = world.rayDistance(t.pos, dir, step);
    if (t.returns && wall <= step) {
      stick(state, t, t.pos.addScaledVector(dir, wall), dir);
      continue;
    }
    if (t.returns && t.life <= 0) {
      drop(t);
      continue;
    }
    if (wall <= step || t.life <= 0) {
      shatter(state, wall <= step ? t.pos.addScaledVector(dir, wall) : t.pos);
      t.alive = false;
      continue;
    }
    t.pos.copy(next);
  }
}

function shatter(state: CombatState, at: Vector3) {
  state.events.push('thrownBreak', 0, at.x, at.y, at.z);
}

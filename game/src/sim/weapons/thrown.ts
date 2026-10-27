// M2 — thrown weapons in flight (design §6: breaking is a payoff). A thrown weapon flies in a flat arc, spinning; the
// first target it passes takes a big hit (and a hit-stop); a wall stops it. Either way it breaks.
import { Vector3 } from 'three';
import { FEEDBACK } from '../../tuning/combat';
import { WEAPONS } from '../../tuning/weapons';
import type { CollisionWorld } from '../collisionWorld';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, nearestTarget } from '../combat/strike';
import { THROWN_GRAVITY } from './weapons';

/** How close it must pass a target's capsule to hit it (m). */
export const THROWN_RADIUS = 0.35;

const next = new Vector3();
const dir = new Vector3();
const hit = emptyTargetHit();

export function updateThrown(state: CombatState, world: CollisionWorld, dt: number) {
  const v = WEAPONS.v;
  for (const t of state.thrown) {
    if (!t.alive) continue;
    t.life -= dt;
    t.spin += v.throwSpin * dt;
    t.vel.y -= THROWN_GRAVITY * dt;
    next.copy(t.pos).addScaledVector(t.vel, dt);
    if (nearestTarget(state, t.pos, next, THROWN_RADIUS, hit)) {
      const flat = Math.hypot(t.vel.x, t.vel.z) || 1;
      landHit(state, hit, v.throwDamage, v.throwKnock, t.vel.x / flat, t.vel.z / flat, 'hitThrown', v.throwDamage);
      state.hitStop.request(FEEDBACK.v.stopHeavy);
      shatter(state, t.pos.lerp(next, hit.s));
      t.alive = false;
      continue;
    }
    const step = t.pos.distanceTo(next);
    dir.subVectors(next, t.pos).divideScalar(Math.max(step, 1e-6));
    const wall = world.rayDistance(t.pos, dir, step);
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

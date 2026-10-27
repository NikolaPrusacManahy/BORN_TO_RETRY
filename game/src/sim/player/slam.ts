// M1 — the ground slam: in the air, slam straight down. Landing opens a short window where a jump bounces
// you higher. Update 0.0.3 — it had no key for a while.
// Update 0.0.12 — the designer: F slams, but only from a real height (SLAM.minHeight above the ground: near the top
// of a jump, or off a ledge, a pad or a wall), so the impact earns its boom. The landing blasts every enemy near it
// (sim/combat/slamHit.ts), harder the further you fell.
import { Vector3 } from 'three';
import { SLAM } from '../../tuning/movement';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from './state';

const from = new Vector3();
const DOWN = new Vector3(0, -1, 0);
/** No ground within this far below counts as "very high" (m). */
const LOOK_DOWN = 60;

/** How high the feet are above whatever is below them (m). */
export function heightAboveGround(p: PlayerState, world: CollisionWorld): number {
  from.set(p.pos.x, p.pos.y + 0.05, p.pos.z);
  return world.rayDistance(from, DOWN, LOOK_DOWN) - 0.05;
}

export function tryStartSlam(p: PlayerState, pressed: boolean, world: CollisionWorld): boolean {
  if (!pressed || p.grounded || p.slamming || p.dashTime > 0) return false;
  if (heightAboveGround(p, world) < SLAM.v.minHeight) return false;
  p.slamming = true;
  p.slamFrom = p.pos.y;
  p.vel.set(0, -SLAM.v.speed, 0);
  p.events.push('slam');
  return true;
}

export function updateSlam(p: PlayerState) {
  p.vel.set(0, -SLAM.v.speed, 0);
}

/** Called on the tick a slam hits the ground. `speed`: how fast it was falling. */
export function landSlam(p: PlayerState, speed: number) {
  p.slamming = false;
  p.slamBounce = SLAM.v.bounceWindow;
  p.slamImpact = Math.max(0.01, p.slamFrom - p.pos.y);
  p.events.push('slamLand', speed);
}

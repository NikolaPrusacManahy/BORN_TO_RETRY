// M1 — wall jumps (a few in a row before you must touch the ground) and the wall slide: pushing into a wall
// while falling slows the fall.
import type { Vector3 } from 'three';
import { WALL } from '../../tuning/movement';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from './state';

/** Jumps off a wall if one is within reach. Returns true if it did. */
export function tryWallJump(p: PlayerState, world: CollisionWorld, scratch: Vector3): boolean {
  if (p.grounded || p.wallJumpsLeft <= 0 || p.jumpBuffer <= 0) return false;
  if (!world.probeWall(p.pos, WALL.v.reach, scratch)) return false;
  // Drop the part of your speed that goes into the wall, then push off it.
  const into = p.vel.x * scratch.x + p.vel.z * scratch.z;
  if (into < 0) {
    p.vel.x -= scratch.x * into;
    p.vel.z -= scratch.z * into;
  }
  p.vel.x += scratch.x * WALL.v.outSpeed;
  p.vel.z += scratch.z * WALL.v.outSpeed;
  p.vel.y = WALL.v.upSpeed;
  p.wallJumpsLeft--;
  p.jumpBuffer = 0;
  p.slamming = false;
  p.events.push('wallJump', WALL.v.count - p.wallJumpsLeft);
  return true;
}

/** Pushing into a wall you're touching while falling: fall no faster than the wall-slide speed. */
export function applyWallSlide(p: PlayerState, wish: Vector3) {
  if (p.grounded || !p.onWall || p.vel.y >= -WALL.v.slideFall) return;
  const pushing = wish.x * p.wallNormal.x + wish.z * p.wallNormal.z < -0.1;
  if (pushing) p.vel.y = -WALL.v.slideFall;
}

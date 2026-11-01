// Update 0.0.3 — wall running (the designer): in the air next to a wall, holding forward, heading along it (not
// into it), not rising fast and moving along it fast enough, you run along it for up to 2 s on a gentle arc. Jump to push off towards the other side; the next wall
// you reach starts a fresh run, so runs chain. A wall can't be run on twice without landing in between.
import { Vector3 } from 'three';
import { MOVE, WALL, WALLRUN } from '../../tuning/movement';
import { bears } from '../cards/cards';
import { dashMaxOf } from './dash';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerIntent } from './intent';
import type { PlayerState } from './state';

/** Each tick the run pushes this hard into the wall so contact holds; the collision takes it away again (m/s). */
export const WALL_STICK = 1.5;
/** Two walls whose normals are this alike are the same wall. */
const SAME_WALL = 0.9;
/** A run carries on round a gentle bend, but not round a corner (normals' dot). */
const KEEP_WALL = 0.7;
/** The run's wall can be a little further than the reach to start one. */
const KEEP_REACH = 0.1;

const n = new Vector3();
const along = new Vector3();

/** The horizontal part of `vel` along a wall: writes its direction (when there is one) and returns its speed. */
function alongWall(vel: Vector3, normal: Vector3, dir: Vector3): number {
  const into = vel.x * normal.x + vel.z * normal.z;
  along.set(vel.x - normal.x * into, 0, vel.z - normal.z * into);
  const speed = Math.hypot(along.x, along.z);
  if (speed > 0.5) dir.copy(along).divideScalar(speed);
  return speed;
}

/** `wish`: the way you're heading (length 1). */
export function tryStartWallRun(p: PlayerState, intent: PlayerIntent, wish: Vector3, world: CollisionWorld): boolean {
  if (p.grounded || p.wallRunning || p.sliding || p.slamming || p.dashTime > 0 || p.wallRunCooldown > 0 || intent.moveZ <= 0) return false;
  // Update 0.0.3 — flying up past a wall (a pad launch, the start of a jump) never grabs it.
  if (p.vel.y > WALLRUN.v.maxRise) return false;
  if (!world.probeWall(p.pos, WALL.v.reach, n)) return false;
  // Heading along the wall, not into (or away from) it: facing the wall and turning a little isn't a run.
  if (Math.abs(wish.x * n.x + wish.z * n.z) > Math.sin((WALLRUN.v.facingAngle * Math.PI) / 180)) return false;
  if (p.lastWallSet && n.dot(p.lastWallNormal) > SAME_WALL) return false;
  if (alongWall(p.vel, n, p.wallRunDir) < WALLRUN.v.minSpeed) return false;
  p.wallRunning = true;
  p.wallRunTime = 0;
  p.wallNormal.copy(n);
  p.vel.y = WALLRUN.v.startUp;
  // (Update 0.2.15 — Second Wind, a Fate Card: a wall run gives you back a dash.)
  if (bears(p, 'secondWind')) p.dashCharges = Math.min(dashMaxOf(p), p.dashCharges + 1);
  p.events.push('wallRunStart');
  return true;
}

/** Stops running; this wall can't be run on again until you land. */
export function endWallRun(p: PlayerState) {
  if (!p.wallRunning) return;
  p.wallRunning = false;
  p.lastWallNormal.copy(p.wallNormal);
  p.lastWallSet = true;
  p.events.push('wallRunEnd');
}

/** Runs along the wall this tick. Returns false (having ended the run) when the run is over. */
export function updateWallRun(p: PlayerState, intent: PlayerIntent, world: CollisionWorld, dt: number): boolean {
  p.wallRunTime += dt;
  const lost = p.grounded || !world.probeWall(p.pos, WALL.v.reach + KEEP_REACH, n) || n.dot(p.wallNormal) < KEEP_WALL;
  if (lost || p.wallRunTime >= WALLRUN.v.maxTime || intent.moveZ <= 0) {
    endWallRun(p);
    return false;
  }
  p.wallNormal.copy(n);
  const speed = Math.max(alongWall(p.vel, n, p.wallRunDir), WALLRUN.v.speed);
  p.vel.x = p.wallRunDir.x * speed - n.x * WALL_STICK;
  p.vel.z = p.wallRunDir.z * speed - n.z * WALL_STICK;
  p.vel.y = Math.max(p.vel.y - MOVE.v.gravity * WALLRUN.v.gravity * dt, -WALLRUN.v.maxFall);
  return true;
}

/** Jumps off the wall being run on: up, and away towards the other side, keeping the speed along the wall. */
export function wallRunJump(p: PlayerState) {
  const speed = alongWall(p.vel, p.wallNormal, p.wallRunDir);
  p.vel.x = p.wallRunDir.x * speed + p.wallNormal.x * WALLRUN.v.jumpOut;
  p.vel.z = p.wallRunDir.z * speed + p.wallNormal.z * WALLRUN.v.jumpOut;
  p.vel.y = WALLRUN.v.jumpUp;
  p.wallRunning = false;
  p.lastWallNormal.copy(p.wallNormal);
  p.lastWallSet = true;
  p.wallRunCooldown = WALLRUN.v.cooldown;
  p.jumpBuffer = 0;
  p.events.push('wallRunJump');
}

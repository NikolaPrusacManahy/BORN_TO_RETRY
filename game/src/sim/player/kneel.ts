// Update 0.0.13 — kneeling at a chest (the designer: walk up, crouch, open it with both hands). For a moment you don't
// move or fight: you're eased onto the spot in front of the chest, facing it, and stay there until the lid is up and
// what was inside is yours. Pure.
import { Vector3 } from 'three';
import type { CollisionWorld, MoveResult } from '../collisionWorld';
import type { PlayerState } from './state';

/** How fast you're eased onto the spot (per second). */
const SETTLE = 12;

const delta = new Vector3();
const move: MoveResult = { grounded: false, hitCeiling: false, wall: false, wallNormal: new Vector3() };

/** Kneel for `time` seconds at (x, z), facing `yaw`. Ends a slide, a dash or a wall run. */
export function startKneel(p: PlayerState, x: number, z: number, yaw: number, time: number) {
  p.kneel = time;
  p.kneelAt.set(x, p.pos.y, z);
  p.kneelYaw = yaw;
  p.vel.set(0, 0, 0);
  p.dashTime = 0;
  p.slamming = p.wallRunning = false;
}

/** One tick of kneeling. Returns false when you're not (the normal movement runs instead). */
export function updateKneel(p: PlayerState, world: CollisionWorld, dt: number): boolean {
  if (p.kneel <= 0) return false;
  p.kneel = Math.max(0, p.kneel - dt);
  p.yaw = p.kneelYaw;
  p.vel.set(0, 0, 0);
  const k = 1 - Math.exp(-SETTLE * dt);
  delta.set((p.kneelAt.x - p.pos.x) * k, -0.02, (p.kneelAt.z - p.pos.z) * k);
  world.movePlayer(p.pos, delta, true, move);
  p.grounded = true;
  return true;
}

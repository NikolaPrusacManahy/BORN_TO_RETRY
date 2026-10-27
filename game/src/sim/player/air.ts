// M1 — steering in the air. You can turn freely without losing speed, but input alone never pushes you past
// run speed (only dashes, slides and jumps do).
import type { Vector3 } from 'three';
import { MOVE } from '../../tuning/movement';

export function airMove(vel: Vector3, wishX: number, wishZ: number, dt: number) {
  if (wishX === 0 && wishZ === 0) return;
  const run = MOVE.v.runSpeed;
  const rate = (run / MOVE.v.accelTime) * MOVE.v.airControl;
  const cap = Math.max(run, Math.hypot(vel.x, vel.z));
  vel.x += wishX * rate * dt;
  vel.z += wishZ * rate * dt;
  const speed = Math.hypot(vel.x, vel.z);
  if (speed > cap) {
    vel.x *= cap / speed;
    vel.z *= cap / speed;
  }
}

/** Gravity, capped at the max fall speed. */
export function applyGravity(vel: Vector3, dt: number, scale = 1) {
  vel.y = Math.max(vel.y - MOVE.v.gravity * scale * dt, -MOVE.v.maxFall);
}

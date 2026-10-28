// M1 — steering in the air. Input pushes you towards the wanted direction only while you're slower than run speed
// in that direction (Quake-style), so holding forward never bleeds off sideways momentum — Update 0.0.3: a
// wall-run jump keeps its push towards the next wall. Input alone never takes you past run speed (or your speed
// before the push), so steering turns you without speeding you up.
import type { Vector3 } from 'three';
import { MOVE } from '../../tuning/movement';

/** `speedMul`: run speed times this (Update 0.0.13 — the blue rings). */
export function airMove(vel: Vector3, wishX: number, wishZ: number, dt: number, speedMul = 1) {
  if (wishX === 0 && wishZ === 0) return;
  const run = MOVE.v.runSpeed * speedMul;
  const along = vel.x * wishX + vel.z * wishZ;
  if (along >= run) return;
  const before = Math.hypot(vel.x, vel.z);
  const push = Math.min((run / MOVE.v.accelTime) * MOVE.v.airControl * dt, run - along);
  vel.x += wishX * push;
  vel.z += wishZ * push;
  const cap = Math.max(run, before);
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

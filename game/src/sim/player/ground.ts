// M1 — moving on the ground: quick acceleration to run speed, a quick stop when you let go. Extra speed
// from a dash or slide isn't cut at once: it bleeds off at `overspeedDecel`, so chains keep their momentum.
// Update 0.3.11 — `grip` (floor 7's ice: less than 1): speeding up, turning, stopping and the extra speed bleeding off all
// take that much longer, so what you start keeps going.
import type { Vector3 } from 'three';
import { MOVE } from '../../tuning/movement';

/** Moves (vx, vz) towards (tx, tz) by at most `maxDelta`. Writes into `vel`. */
export function moveToward(vel: Vector3, tx: number, tz: number, maxDelta: number) {
  const dx = tx - vel.x;
  const dz = tz - vel.z;
  const len = Math.hypot(dx, dz);
  if (len <= maxDelta || len < 1e-9) {
    vel.x = tx;
    vel.z = tz;
  } else {
    vel.x += (dx / len) * maxDelta;
    vel.z += (dz / len) * maxDelta;
  }
}

/** `wishX/Z`: the wanted direction, length 1 (or 0 for no input). `speedMul`: run speed times this (Update 0.0.13 —
 *  the blue rings). */
export function groundMove(vel: Vector3, wishX: number, wishZ: number, dt: number, speedMul = 1, grip = 1) {
  const run = MOVE.v.runSpeed * speedMul;
  if (wishX === 0 && wishZ === 0) {
    moveToward(vel, 0, 0, (run / MOVE.v.stopTime) * grip * dt);
    return;
  }
  const speed = Math.hypot(vel.x, vel.z);
  const target = speed > run ? Math.max(run, speed - MOVE.v.overspeedDecel * grip * dt) : run;
  moveToward(vel, wishX * target, wishZ * target, (run / MOVE.v.accelTime) * grip * dt);
}

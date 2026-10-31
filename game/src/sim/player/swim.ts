// Update 0.2.11 — swimming (floor 6, the Sunken Grove, fully under water: the designer, "full under water gameplay …
// enemies swims faster than you and you have to deal with the pain of being slower than them, swiming feeling and
// mechanics is needed"). Under water you swim, you don't run: forward is where you look (up and down too), jump rises,
// the slide key dives; you speed up slowly and glide to a stop; doing nothing you sink, slowly. On the floor, jump pushes
// off it. The dash key kicks: a burst where you're heading, untouchable as a dash is, its charges slower to come back.
// No wall runs, wall jumps or slides (step.ts); your eyes never leave the water (PlayerState.swimTop). Pure.
import { Vector3 } from 'three';
import { CAMERA } from '../../tuning/camera';
import { SWIM } from '../../tuning/swim';
import type { PlayerIntent } from './intent';
import type { PlayerState } from './state';

const wish = new Vector3();

/** Where you want to swim: forward along the look (`pitch` up), strafing flat, rising or diving (length 1, or 0). */
export function swimWish(intent: PlayerIntent, out: Vector3): Vector3 {
  const pitch = intent.pitch ?? 0;
  const s = Math.sin(intent.yaw);
  const c = Math.cos(intent.yaw);
  const flat = Math.cos(pitch);
  // Forward is (-sin, -cos) on the ground plane, tipped up by the pitch; right is (cos, -sin).
  out.set(-s * flat * intent.moveZ + c * intent.moveX, Math.sin(pitch) * intent.moveZ, -c * flat * intent.moveZ - s * intent.moveX);
  out.y += (intent.jumpHeld ? 1 : 0) - (intent.slideHeld ? 1 : 0);
  const len = out.length();
  if (len > 1) out.multiplyScalar(1 / len);
  return out;
}

/** Moves `vel` towards `target` by at most `maxDelta` (3D). */
function toward(vel: Vector3, tx: number, ty: number, tz: number, maxDelta: number) {
  const dx = tx - vel.x;
  const dy = ty - vel.y;
  const dz = tz - vel.z;
  const len = Math.hypot(dx, dy, dz);
  if (len <= maxDelta || len < 1e-9) vel.set(tx, ty, tz);
  else vel.set(vel.x + (dx / len) * maxDelta, vel.y + (dy / len) * maxDelta, vel.z + (dz / len) * maxDelta);
}

/** One tick of swimming: the kick, pushing off the floor, then the water's pull on your speed. */
export function swim(p: PlayerState, intent: PlayerIntent, dt: number) {
  const v = SWIM.v;
  swimWish(intent, wish);
  kick(p, intent.dashPressed);
  if (intent.jumpPressed && p.grounded) {
    p.vel.y = Math.max(p.vel.y, v.pushOff);
    p.grounded = false;
    p.events.push('swimPush');
  }
  const top = v.speed * p.speedMul;
  const speed = p.vel.length();
  if (wish.lengthSq() < 1e-12) {
    // Let go: you glide to a stop, then sink (out of a kick, as fast as its drag).
    toward(p.vel, 0, -v.sink, 0, (speed > top ? v.kickDrag : top / v.glideTime) * dt);
    return;
  }
  // (Faster than swim speed after a kick: it bleeds off, it isn't cut.)
  const target = speed > top ? Math.max(top, speed - v.kickDrag * dt) : top;
  toward(p.vel, wish.x * target, wish.y * target, wish.z * target, (Math.max(top, speed) / v.accelTime) * dt);
}

/** The dash key under water: a kick where you're heading (or looking), untouchable a moment. */
function kick(p: PlayerState, pressed: boolean) {
  if (!pressed || p.dashCharges < 1 || p.dashLock > 0) return;
  const v = SWIM.v;
  p.dashCharges -= 1;
  p.invuln = Math.max(p.invuln, v.kickTime);
  if (wish.lengthSq() > 1e-6) p.vel.copy(wish).normalize();
  else p.vel.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  p.vel.multiplyScalar(v.kickSpeed);
  p.grounded = false;
  p.events.push('swimKick');
}

/** The highest your feet go: your eyes stay under the water's top. */
export const swimCeiling = (top: number) => top - SWIM.v.head - CAMERA.v.eyeHeight;

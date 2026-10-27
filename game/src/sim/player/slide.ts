// M1 — the slide: low, fast and steady. It eases up to the slide speed (never below it), keeps it, and bends
// slowly towards where you steer. Update 0.0.3 (the designer): a slide needs a fresh press — pressed in the air,
// it starts when you land — and it lasts 1 s at most. It ends when you let go (with room to stand), leave the
// ground, or run out of time.
import type { Vector3 } from 'three';
import { MOVE, SLIDE } from '../../tuning/movement';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from './state';

/** A press arms the next slide; letting go disarms it. */
export function armSlide(p: PlayerState, pressed: boolean, held: boolean) {
  if (pressed) p.slideArmed = true;
  if (!held) p.slideArmed = false;
}

export function canStartSlide(p: PlayerState, held: boolean): boolean {
  return held && p.slideArmed && p.grounded && !p.sliding && p.dashTime <= 0 && !p.wallRunning;
}

export function startSlide(p: PlayerState, wish: Vector3) {
  const speed = Math.hypot(p.vel.x, p.vel.z);
  if (speed > 1) p.slideDir.set(p.vel.x / speed, 0, p.vel.z / speed);
  else if (wish.x !== 0 || wish.z !== 0) p.slideDir.set(wish.x, 0, wish.z);
  else p.slideDir.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  p.slideSpeed = Math.max(speed, SLIDE.v.speedFloor);
  p.slideCur = speed;
  p.slideTime = 0;
  p.sliding = true;
  p.slideArmed = false;
  p.events.push('slideStart', p.slideSpeed);
}

export function updateSlide(p: PlayerState, wish: Vector3, dt: number) {
  if (wish.x !== 0 || wish.z !== 0) {
    // Turn the slide towards the wanted direction by at most `steer` rad/s.
    const cross = p.slideDir.z * wish.x - p.slideDir.x * wish.z;
    const dot = p.slideDir.x * wish.x + p.slideDir.z * wish.z;
    const angle = Math.atan2(cross, dot);
    const turn = Math.max(-SLIDE.v.steer * dt, Math.min(SLIDE.v.steer * dt, angle));
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    const x = p.slideDir.x * c + p.slideDir.z * s;
    const z = -p.slideDir.x * s + p.slideDir.z * c;
    p.slideDir.set(x, 0, z);
  }
  p.slideTime += dt;
  p.slideSpeed = Math.max(MOVE.v.runSpeed, p.slideSpeed - SLIDE.v.friction * dt);
  const ramp = SLIDE.v.rampTime > 0 ? (SLIDE.v.speedFloor / SLIDE.v.rampTime) * dt : Infinity;
  p.slideCur = Math.min(p.slideSpeed, p.slideCur + ramp);
  p.vel.x = p.slideDir.x * p.slideCur;
  p.vel.z = p.slideDir.z * p.slideCur;
}

/** Should the slide end now? Never while there's no room to stand (under a low ceiling it carries on). */
export function slideOver(p: PlayerState, held: boolean, world: CollisionWorld): boolean {
  if (!p.grounded) return true;
  if (held && p.slideTime < SLIDE.v.maxTime) return false;
  return world.canStand(p.pos);
}

export function endSlide(p: PlayerState) {
  if (!p.sliding) return;
  p.sliding = false;
  p.events.push('slideEnd');
}

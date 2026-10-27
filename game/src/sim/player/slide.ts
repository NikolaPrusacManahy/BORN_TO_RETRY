// M1 — the slide: low, fast and steady. It keeps your speed (never below the slide speed) and bends slowly
// towards where you steer. It ends when you let go and there's room to stand, or when you leave the ground.
import type { Vector3 } from 'three';
import { MOVE, SLIDE } from '../../tuning/movement';
import type { PlayerState } from './state';

export function canStartSlide(p: PlayerState, held: boolean): boolean {
  return held && p.grounded && !p.sliding && p.dashTime <= 0;
}

export function startSlide(p: PlayerState, wish: Vector3) {
  const speed = Math.hypot(p.vel.x, p.vel.z);
  if (speed > 1) p.slideDir.set(p.vel.x / speed, 0, p.vel.z / speed);
  else if (wish.x !== 0 || wish.z !== 0) p.slideDir.set(wish.x, 0, wish.z);
  else p.slideDir.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  p.slideSpeed = Math.max(speed, SLIDE.v.speedFloor);
  p.sliding = true;
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
  p.slideSpeed = Math.max(MOVE.v.runSpeed, p.slideSpeed - SLIDE.v.friction * dt);
  p.vel.x = p.slideDir.x * p.slideSpeed;
  p.vel.z = p.slideDir.z * p.slideSpeed;
}

export function endSlide(p: PlayerState) {
  if (!p.sliding) return;
  p.sliding = false;
  p.events.push('slideEnd');
}

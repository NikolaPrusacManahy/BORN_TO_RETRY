// M1 — the ground slam: in the air, slam straight down. Landing opens a short window where a jump bounces
// you higher. Update 0.0.3 — it has no key: the slide key in the air waits to slide on landing instead, and the
// designer wants the slam back later as an unlockable skill. `tryStartSlam` is kept for that.
import { SLAM } from '../../tuning/movement';
import type { PlayerState } from './state';

export function tryStartSlam(p: PlayerState, pressed: boolean): boolean {
  if (!pressed || p.grounded || p.slamming || p.dashTime > 0) return false;
  p.slamming = true;
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
  p.events.push('slamLand', speed);
}

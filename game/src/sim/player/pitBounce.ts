// Update 0.3.67 (the designer: "when falling in them, just take a few amount of damage and bounce back out, not teleporting away") — thrown back out of a pit: a short arc to where you
// last stood on solid ground, the time and height worked out so it lands there whatever the gravity. Its sideways speed is set afresh each tick, so a pit's wall only holds you till you've
// risen past it (a wall takes away speed into it for good). No control through it, so nothing can hurt you through it either. Pure.
import { HEALTH } from '../../tuning/health';
import { MOVE } from '../../tuning/movement';
import { applyGravity } from './air';
import type { PlayerState } from './state';
import { endWallRun } from './wallRun';

/** Thrown again this soon after the last (s), something's in the way: this much higher each time, over it (m). */
const AGAIN_FOR = 2.5;
const AGAIN_UP = 5;

/** Up and over to (x, y, z). */
export function startBounce(p: PlayerState, x: number, y: number, z: number) {
  const g = MOVE.v.gravity * p.gravity;
  const tries = p.bounceAgain > 0 ? p.bounceTries + 1 : 0;
  const far = Math.hypot(x - p.pos.x, z - p.pos.z);
  // Further to go, a higher arc: more time, so not an absurd speed.
  const top = Math.max(y, p.pos.y) + HEALTH.v.pitBounce + Math.min(8, far * 0.12) + AGAIN_UP * tries;
  const up = Math.sqrt(2 * g * (top - p.pos.y));
  const time = up / g + Math.sqrt((2 * (top - y)) / g);
  p.vel.set(0, up, 0);
  p.bounce = time;
  p.bounceTo.set(x, y, z);
  p.bounceTries = tries;
  p.bounceAgain = time + AGAIN_FOR;
  p.invuln = Math.max(p.invuln, time);
  p.grounded = false;
  p.slamming = false;
  p.dashTime = 0;
  p.coyote = 0;
  p.jumpBuffer = 0;
  endWallRun(p);
}

/** One tick of it, before the move. */
export function stepBounce(p: PlayerState, dt: number) {
  p.bounce = Math.max(0, p.bounce - dt);
  applyGravity(p.vel, dt, p.gravity);
  if (p.bounce <= 0) {
    p.vel.x = p.vel.z = 0;
    return;
  }
  p.vel.x = (p.bounceTo.x - p.pos.x) / Math.max(dt, p.bounce);
  p.vel.z = (p.bounceTo.z - p.pos.z) / Math.max(dt, p.bounce);
}

/** After the move: down on your feet, it's over, and no carrying on across the floor. */
export function landBounce(p: PlayerState) {
  if (p.bounce <= 0 || !p.grounded) return;
  p.bounce = 0;
  p.vel.x = p.vel.z = 0;
}

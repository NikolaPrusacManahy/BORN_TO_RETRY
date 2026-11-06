// Update 0.3.81 — Gravity Sean's movement passive (an open decision in his bible: "holding jump to hover briefly, or slower falling, so Sean feels like he bends gravity
// even when not attacking"; a placeholder): falling with jump held, he sinks slowly, for a while each time he's off the ground. Pure.
import { SEAN } from '../../tuning/sean';
import type { PlayerState } from './state';

/** How fast he rises to it (m/s, and per metre to go). */
const RISE = 4;
const RISE_RATE = 7;

/** Update 0.3.83 — Black Hole has him: he rises to `p.floatY` and hangs there, drifting if he's asked to, with none of his other moves. */
export function stepFloat(p: PlayerState, wishX: number, wishZ: number) {
  const v = SEAN.v;
  p.vel.x = wishX * v.floatMove;
  p.vel.z = wishZ * v.floatMove;
  p.vel.y = Math.max(-RISE, Math.min(RISE, (p.floatY - p.pos.y) * RISE_RATE));
  p.slamming = false;
  p.dashTime = 0;
}

/** One tick of falling. */
export function stepHover(p: PlayerState, held: boolean, dt: number) {
  if (!p.sean) return;
  const v = SEAN.v;
  if (p.grounded) {
    p.hover = v.hoverTime;
    return;
  }
  p.hovering = held && p.hover > 0 && p.vel.y <= -v.hoverFall;
  if (!p.hovering) return;
  p.vel.y = -v.hoverFall;
  p.hover -= dt;
}

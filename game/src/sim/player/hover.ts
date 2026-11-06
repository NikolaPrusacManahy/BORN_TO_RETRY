// Update 0.3.81 — Gravity Sean's movement passive (an open decision in his bible: "holding jump to hover briefly, or slower falling, so Sean feels like he bends gravity
// even when not attacking"; a placeholder): falling with jump held, he sinks slowly, for a while each time he's off the ground. Pure.
import { SEAN } from '../../tuning/sean';
import type { PlayerState } from './state';

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

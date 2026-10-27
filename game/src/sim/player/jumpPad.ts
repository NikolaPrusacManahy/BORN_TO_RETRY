// M1 — jump pads launch you straight up when you step or land on them.
import type { JumpPad } from '../../world/arena';
import type { PlayerState } from './state';

/** How far above or below a pad's surface the feet may be and still trigger it (m). */
export const PAD_TOLERANCE = 0.25;

export function checkPads(p: PlayerState, pads: readonly JumpPad[]): boolean {
  if (p.vel.y > 0.1) return false;
  for (const pad of pads) {
    const dx = p.pos.x - pad.x;
    const dz = p.pos.z - pad.z;
    if (dx * dx + dz * dz > pad.radius * pad.radius || Math.abs(p.pos.y - pad.y) > PAD_TOLERANCE) continue;
    p.vel.y = pad.launch;
    p.grounded = false;
    p.coyote = 0;
    p.slamming = false;
    p.events.push('pad', pad.launch);
    return true;
  }
  return false;
}

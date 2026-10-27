// M1 step 8 — hazards: the lab's spike strips. Touching a strip's top hurts and pops you up out of it (a dash
// carries you over unhurt). They're arena boxes of kind 'hazard', so they're also solid and drawn like any box.
import { HEALTH } from '../../tuning/health';
import type { ArenaBox } from '../../world/arena';
import { damagePlayer } from './health';
import type { PlayerState } from './state';

/** How far above a strip's top the feet may be and still touch it (m). */
export const SPIKE_TOLERANCE = 0.15;

/** Hurts the player if their feet are on a hazard. Returns true if it hurt. */
export function checkHazards(p: PlayerState, hazards: readonly ArenaBox[]): boolean {
  for (const h of hazards) {
    const top = h.y + h.h / 2;
    if (Math.abs(p.pos.x - h.x) > h.w / 2 || Math.abs(p.pos.z - h.z) > h.d / 2) continue;
    if (p.pos.y < top - 0.05 || p.pos.y > top + SPIKE_TOLERANCE) continue;
    if (!damagePlayer(p, HEALTH.v.spikeDamage)) return false;
    p.vel.y = Math.max(p.vel.y, HEALTH.v.spikeBounce);
    p.grounded = false;
    p.coyote = 0;
    return true;
  }
  return false;
}

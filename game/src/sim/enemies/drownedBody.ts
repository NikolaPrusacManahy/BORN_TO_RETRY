// Update 0.3.58 — what the Drowned King has that no other enemy does (spec MD_UPDATES/U0358_DROWNED_KING_BIBLE.md): the little heads
// on its body (they fly at you, and grow back), the mark its hits leave on you once it's risen (Blood Frenzy), the water it has
// knocked you into, its great maw. Pure.
import { DROWNED } from '../../tuning/drowned';
import type { Enemy } from './enemy';

export interface DrownedBody {
  /** The heads on its body now. */
  heads: number;
  /** Seconds till the next one grows back. */
  regrow: number;
  /** Seconds left of its mark on you (0: none), and your hits it last counted (−1: not yet). */
  mark: number;
  hitsSeen: number;
  /** It's knocked you into the water: it Fin Dives you at once. */
  finNow: boolean;
  /** Its first move's done (it opens with a volley: what it wants you to learn). */
  opened: boolean;
  /** Its jaw's jammed open (Maw of Many, parried). */
  jammed: boolean;
}

export const createDrownedBody = (): DrownedBody => ({ heads: Math.round(DROWNED.v.headsOn), regrow: 0, mark: 0, hitsSeen: -1, finNow: false, opened: false, jammed: false });

/** Its heads growing back. */
export function stepHeads(b: DrownedBody, dt: number) {
  const full = Math.round(DROWNED.v.headsOn);
  if (b.heads >= full) {
    b.regrow = DROWNED.v.headsBack;
    return;
  }
  b.regrow -= dt;
  if (b.regrow > 0) return;
  b.regrow = DROWNED.v.headsBack;
  b.heads++;
}

/** How much of its mark on you is left (0..1), of the enemies given. */
export function markOn(enemies: readonly Enemy[]): number {
  for (const e of enemies) if (e.alive && e.phase !== 'dead' && e.drowned) return Math.min(1, e.drowned.mark / Math.max(0.1, DROWNED.v.markFor));
  return 0;
}

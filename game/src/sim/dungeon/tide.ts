// Update 0.2.10 — the tide (floor 5, the Drowned Temple; the designer chose the floor, the tide is Claude's): every
// fight room floods and drains on one clock (tuning/tide.ts): low water, then a horn and the water rising, high water,
// then the water falling. The water stands over the rooms' low floor; at high water it's knee-deep, and wading in it
// you move at Wading of your speed. Ledges, perches, islands and cover stand above it, dry. Pure.
import { TIDE } from '../../tuning/tide';
import { DROWNED } from '../../tuning/drowned';
import type { ArenaBox } from '../../world/arena';
import type { EventQueue } from '../../core/eventQueue';
import type { CombatEvent } from '../combat/state';
import type { PlayerState } from '../player/state';

export interface Tide {
  /** Seconds into the cycle (low, rising, high, falling). */
  t: number;
  /** The water's top over the low floor (m; 0: drained). */
  level: number;
}

/** Shallower than this, the water slows nobody (m). */
export const WADE_MIN = 0.2;
/** Feet this far under the water's top are in it (m). */
const IN_WATER = 0.05;

export const createTide = (): Tide => ({ t: 0, level: 0 });

/** The cycle's length (s). */
export const tideCycle = () => TIDE.v.low + TIDE.v.rise + TIDE.v.high + TIDE.v.fall;

/** The water's top at `t` seconds into the cycle (eased in and out of the rise and the fall). */
export function tideLevel(t: number): number {
  const v = TIDE.v;
  const s = ((t % tideCycle()) + tideCycle()) % tideCycle();
  const ease = (k: number) => k * k * (3 - 2 * k);
  if (s < v.low) return 0;
  if (s < v.low + v.rise) return v.depth * ease((s - v.low) / v.rise);
  if (s < v.low + v.rise + v.high) return v.depth;
  return v.depth * (1 - ease((s - v.low - v.rise - v.high) / v.fall));
}

/** One tick: the clock and the level; the horn as the water starts to rise ('tideRise'), and 'tideFall' as it drains. */
export function stepTide(tide: Tide, events: EventQueue<CombatEvent>, dt: number) {
  const v = TIDE.v;
  const before = tide.t % tideCycle();
  tide.t = (tide.t + dt) % tideCycle();
  const now = tide.t;
  const crossed = (at: number) => (before < at && now >= at) || (now < before && (at > before || at <= now));
  if (crossed(v.low)) events.push('tideRise', 0, 0, 0, 0);
  if (crossed(v.low + v.rise + v.high)) events.push('tideFall', 0, 0, 0, 0);
  tide.level = tideLevel(tide.t);
}

/** Your feet in the water: in a flooding room, on its low floor, the water deep enough to wade. */
export function wading(p: PlayerState, tide: Tide, rooms: readonly ArenaBox[]): boolean {
  if (tide.level < WADE_MIN || p.pos.y > tide.level - IN_WATER) return false;
  for (const b of rooms) if (Math.abs(p.pos.x - b.x) <= b.w / 2 && Math.abs(p.pos.z - b.z) <= b.d / 2) return true;
  return false;
}

/** Your speed's share here (1: none of it). */
export const tideSlow = (p: PlayerState, tide: Tide, rooms: readonly ArenaBox[]) => (wading(p, tide, rooms) ? TIDE.v.wading : 1);

/** Your speed's share wading the Drowned King's water (its room, `flood` m deep): knee-deep, a tide's; risen, deeper,
 *  Risen wading. */
export function floodSlow(p: PlayerState, flood: number): number {
  if (flood < WADE_MIN || p.pos.y > flood - IN_WATER) return 1;
  return flood > (DROWNED.v.shallow + DROWNED.v.risenDeep) / 2 ? DROWNED.v.risenWading : TIDE.v.wading;
}

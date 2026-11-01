// Update 0.0.17 — kill bonuses (the designer: like CoD Zombies' power-ups). A kill may drop one (each its own chance,
// up to a few a room): the snowflake (for a while every melee hit freezes what it hits: it stands still, its attack
// paused; never a boss), gold ingots (for a while kills give more coins), the blue potion (for a while you run
// faster). It lies where it fell until you walk over it (drops.ts) or it fades; taking one again starts its time over.
// Pure and seeded.
import type { Vector3 } from 'three';
import type { Rng } from '../../core/rng';
import { BONUS } from '../../tuning/bonus';
import { CARDS } from '../../tuning/cards';
import { holds } from '../cards/cards';
import type { CombatState } from '../combat/state';

export type BonusKind = 'snowflake' | 'goldIngots' | 'bluePotion';
export const BONUS_KINDS: readonly BonusKind[] = ['snowflake', 'goldIngots', 'bluePotion'];

/** Seconds left of each bonus (0: off). */
export type Bonuses = Record<BonusKind, number>;

export function createBonuses(): Bonuses {
  return { snowflake: 0, goldIngots: 0, bluePotion: 0 };
}

const LENGTH: Record<BonusKind, () => number> = {
  snowflake: () => BONUS.v.freezeFor,
  goldIngots: () => BONUS.v.goldFor,
  bluePotion: () => BONUS.v.potionFor,
};

/** Update 0.2.15 — `state`: the run's (Hoarder, a Fate Card, makes them last longer). */
export const bonusLength = (kind: BonusKind, state?: CombatState) => LENGTH[kind]() * (state && holds(state, 'hoarder') ? CARDS.v.hoarder : 1);

/** Counts the bonuses down. */
export function updateBonuses(b: Bonuses, dt: number) {
  for (const k of BONUS_KINDS) b[k] = Math.max(0, b[k] - dt);
}

/** Taking one: its full time again. */
export function takeBonus(state: CombatState, kind: BonusKind, at: Vector3) {
  state.bonuses[kind] = bonusLength(kind, state);
  state.events.push('bonus', BONUS_KINDS.indexOf(kind), at.x, at.y + 1, at.z);
}

/** A kill's roll for a bonus (one roll: snowflake, then gold, then potion by their chances), while the room has any left
 *  to give. Returns the bonus to drop, or null. */
export function rollBonus(state: CombatState, rng: Rng): BonusKind | null {
  if (state.bonusDrops <= 0) return null;
  const v = BONUS.v;
  // (Update 0.2.19 — Ill Omen, a Death Card: half as often.)
  let r = rng() * (holds(state, 'illOmen') ? 2 : 1);
  for (const [kind, odds] of [['snowflake', v.snowflakeOdds], ['goldIngots', v.goldOdds], ['bluePotion', v.potionOdds]] as const) {
    if ((r -= odds) < 0) {
      state.bonusDrops--;
      return kind;
    }
  }
  return null;
}

/** Coins from a kill: `base` (a half counts as one more half the time), more with gold ingots on (seeded). */
export function coinsFor(base: number, state: CombatState, rng: Rng): number {
  // (Update 0.2.19 — Empty Purse: fewer; Miser's Oath: twice as many.)
  const n = base * (state.bonuses.goldIngots > 0 ? 1 + BONUS.v.goldBoost : 1) * (holds(state, 'emptyPurse') ? 1 - CARDS.v.emptyPurse : 1) * (holds(state, 'misersOath') ? 2 : 1);
  const whole = Math.floor(n);
  return whole + (rng() < n - whole ? 1 : 0);
}

/** Your run speed times this with the blue potion on. */
export const hasteFactor = (b: Bonuses) => (b.bluePotion > 0 ? 1 + BONUS.v.potionBoost : 1);

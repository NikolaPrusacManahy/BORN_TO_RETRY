// Update 0.3.81 — Gravity Sean's state and meters (enemy_bibles/Born to Retry — Gravity Sean.docx): his stance, the Instability meter ("it rises while you stay in
// Unstable mode and as you land hits"), and the one meter Black Hole and Meteor share. Apart from his moves (gravity.ts), so that landing a hit (strike.ts) can feed
// them without them leaning on it. Pure.
import { SEAN } from '../../tuning/sean';
import type { CombatEvent } from './state';
import type { EventQueue } from '../../core/eventQueue';

export interface GravityState {
  /** E: in Unstable mode. */
  unstable: boolean;
  /** The Instability meter (0 … 1). Only ever above 0 in Unstable mode. */
  instab: number;
  /** Seconds till E works again (after an overload), and till Ground Slam does. */
  switchWait: number;
  slamWait: number;
  /** The meter Black Hole and Meteor share (0 … 1). */
  ult: number;
  /** Seconds a punch just thrown still meets the boss blows only a parry answers. */
  clash: number;
  /** A dash under way has had its pull settled. */
  dashing: boolean;
}

export function createGravity(): GravityState {
  return { unstable: false, instab: 0, switchWait: 0, slamWait: 0, ult: 0, clash: 0, dashing: false };
}

interface Fed {
  grav: GravityState;
  events: EventQueue<CombatEvent>;
}

/** The shared meter fills. */
export function addUlt(state: Fed, amount: number) {
  const g = state.grav;
  const was = g.ult;
  g.ult = Math.min(1, g.ult + amount);
  if (was < 1 && g.ult >= 1) state.events.push('seanUltReady');
}

/** A hit of his lands. */
export function gravHit(state: Fed) {
  const g = state.grav;
  addUlt(state, SEAN.v.ultHit);
  if (g.unstable) g.instab = Math.min(1, g.instab + SEAN.v.instabHit);
}

/** A kill of his. */
export const gravKill = (state: Fed) => addUlt(state, SEAN.v.ultKill);

/** How much harder Unstable mode hits, now. */
export const instabFactor = (g: GravityState) => 1 + SEAN.v.instabDamage * g.instab;

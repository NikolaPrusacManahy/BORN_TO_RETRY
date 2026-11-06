// Update 0.3.9 — what comes down to the next floor with you (moved out of state.ts, which had grown past 300 lines).
// Pure.
import type { CombatState } from './state';

/** Update 0.0.17 — what comes down to the next floor with you: your weapons (and the one in your hand), your coins,
 *  your keys and rings. */
export function carryOver(from: CombatState, to: CombatState) {
  to.weapon = from.weapon;
  to.bag = from.bag;
  to.slot = from.slot;
  to.money = from.money;
  to.items = from.items;
  to.execution = from.execution;
  // (Update 0.3.81 — Gravity Sean's shared meter.)
  to.grav.ult = from.grav.ult;
  to.kills = from.kills;
}

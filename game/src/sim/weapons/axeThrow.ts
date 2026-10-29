// Update 0.1.6 — the Gold Axe's right click (the designer: "right click is a way to charge up the speed of the throw and
// the damage, releasing when fully charged throws the axe 2 times faster, and pressing right click again will make it
// fly back to the player's hand"; it replaces 0.1.5's overhead chop). Hold it to charge (as long as a charged punch
// takes: the arms cock the axe back over the shoulder), let go to throw it, faster and harder the longer it was held, up
// to Axe charge speed × and Axe charge damage × at the full charge. This throw comes back (recall.ts); Q throws it as any
// weapon is thrown, and it breaks. Pure.
import { FISTS } from '../../tuning/combat';
import type { CombatState } from '../combat/state';

/** Right click (`held`) with the axe in hand. Returns the charge (0 … 1) the tick it's let go, else −1. */
export function updateAxeCharge(state: CombatState, held: boolean, dt: number): number {
  const f = state.fists;
  const time = Math.max(1e-3, FISTS.v.chargeTime);
  if (held) {
    if (!f.charging) {
      f.charging = true;
      f.charge = 0;
      f.chargeReady = false;
      state.events.push('chargeStart');
      return -1;
    }
    f.charge = Math.min(time, f.charge + dt);
    if (f.charge >= time && !f.chargeReady) {
      f.chargeReady = true;
      state.events.push('chargeReady');
    }
    return -1;
  }
  if (!f.charging) return -1;
  const c = Math.min(1, f.charge / time);
  f.charging = f.chargeReady = false;
  f.charge = 0;
  return c;
}

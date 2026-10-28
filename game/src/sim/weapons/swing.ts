// M2 — swinging the held weapon: left click slashes (hold to keep slashing); which way the arm swings is the arms'
// business (Update 0.0.10). The charged right click (timed like the charged punch, fists.ts) becomes the weapon's
// pierce. Hits cost uses; misses are free.
import type { EventQueue } from '../../core/eventQueue';
import type { CombatIntent, Punch } from '../combat/fists';
import type { CombatEvent } from '../combat/state';
import { WEAPON_STATS } from './catalog';
import type { HeldWeapon } from './weapons';

/** Advances the held weapon's swing. Writes a slash into `out` and returns true when one is swung this tick. */
export function updateSlashes(w: HeldWeapon, intent: CombatIntent, events: EventQueue<CombatEvent>, dt: number, out: Punch, rate = 1): boolean {
  w.cooldown = Math.max(0, w.cooldown - dt);
  if (!(intent.attackPressed || intent.attackHeld) || w.cooldown > 0) return false;
  const s = WEAPON_STATS[w.kind]();
  // Update 0.0.17 — green rings make slashes come quicker.
  w.cooldown = s.interval / rate;
  events.push('slash');
  out.kind = 'slash';
  out.damage = s.damage;
  out.knock = s.knock;
  out.charge = 0;
  out.reach = s.reach;
  out.radius = s.width;
  return true;
}

/** A full charge while armed: the fists hand over a 'pierce'; it takes the weapon's numbers (longer, narrower). */
export function asPierce(w: HeldWeapon, out: Punch) {
  const s = WEAPON_STATS[w.kind]();
  out.damage = s.pierceDamage;
  out.knock = s.pierceKnock;
  out.reach = s.pierceReach;
  out.radius = s.pierceWidth;
}

/** Uses a landed hit takes. */
export function usesFor(w: HeldWeapon, kind: Punch['kind']): number {
  return kind === 'pierce' ? WEAPON_STATS[w.kind]().pierceUses : 1;
}

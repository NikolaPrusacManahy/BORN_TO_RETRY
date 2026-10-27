// M1 step 6 — what the fists do this tick: the jab combo (hold to keep punching), the charged punch on release,
// and the quick punch, which is always ready, even mid-charge.
// M2 — holding a weapon (`armed`), left click is the weapon's (weapons/swing.ts) and the charge throws a cleave;
// the quick punch stays the left fist's.
import type { EventQueue } from '../../core/eventQueue';
import { FISTS } from '../../tuning/combat';
import type { CombatEvent } from './state';

export interface FistState {
  /** Next step of the jab combo (0, 1, 2 = the finisher). */
  combo: number;
  /** Time left to continue the combo. */
  comboTimer: number;
  jabCooldown: number;
  charging: boolean;
  /** Seconds charged. */
  charge: number;
  /** The charge is full: letting go now throws the punch. */
  chargeReady: boolean;
  quickCooldown: number;
}

export interface CombatIntent {
  attackHeld: boolean;
  attackPressed: boolean;
  heavyHeld: boolean;
  punchPressed: boolean;
  /** M2 — Q: throw the held weapon; E: pick one up. */
  throwPressed: boolean;
  interactPressed: boolean;
  yaw: number;
  pitch: number;
}

export type PunchKind = 'jab' | 'finisher' | 'heavy' | 'quick' | 'slash' | 'cleave';

export interface Punch {
  kind: PunchKind;
  damage: number;
  knock: number;
  /** 1 for a charged punch or cleave, 0 otherwise. */
  charge: number;
  /** M2 — how far it reaches from the eye (m) and its sweep's radius (a sword's is wider than a fist's). */
  reach: number;
  radius: number;
}

export function createFists(): FistState {
  return { combo: 0, comboTimer: 0, jabCooldown: 0, charging: false, charge: 0, chargeReady: false, quickCooldown: 0 };
}

export function emptyCombatIntent(): CombatIntent {
  return { attackHeld: false, attackPressed: false, heavyHeld: false, punchPressed: false, throwPressed: false, interactPressed: false, yaw: 0, pitch: 0 };
}

export function emptyPunch(): Punch {
  return { kind: 'jab', damage: 0, knock: 0, charge: 0, reach: 0, radius: 0 };
}

/** Fills `out` with a fist's punch (a fist's reach and sweep). */
function set(out: Punch, kind: PunchKind, damage: number, knock: number, charge = 0): true {
  out.kind = kind;
  out.damage = damage;
  out.knock = knock;
  out.charge = charge;
  out.reach = FISTS.v.reach;
  out.radius = FISTS.v.radius;
  return true;
}

/** Advances the fists. Writes a punch into `out` and returns true when one is thrown this tick. `armed`: holding a
 *  weapon (no jabs; a full charge throws a 'cleave', which the caller turns into the weapon's). */
export function updateFists(f: FistState, intent: CombatIntent, events: EventQueue<CombatEvent>, dt: number, out: Punch, armed = false): boolean {
  const v = FISTS.v;
  f.jabCooldown = Math.max(0, f.jabCooldown - dt);
  f.quickCooldown = Math.max(0, f.quickCooldown - dt);
  f.comboTimer = Math.max(0, f.comboTimer - dt);

  if (intent.punchPressed && f.quickCooldown <= 0) {
    f.quickCooldown = v.quickCooldown;
    events.push('quick');
    return set(out, 'quick', v.quickDamage, v.quickKnock);
  }

  // Update 0.0.3 (the designer): right click is never a light punch. Hold it for the full charge time; letting go
  // sooner cancels.
  if (intent.heavyHeld) {
    if (!f.charging) {
      f.charging = true;
      f.charge = 0;
      events.push('chargeStart');
    } else {
      f.charge = Math.min(v.chargeTime, f.charge + dt);
      if (f.charge >= v.chargeTime && !f.chargeReady) {
        f.chargeReady = true;
        events.push('chargeReady');
      }
    }
    return false; // no jabs while charging
  }
  if (f.charging) {
    f.charging = false;
    if (!f.chargeReady) {
      events.push('chargeCancel');
      return false;
    }
    f.chargeReady = false;
    events.push(armed ? 'cleave' : 'heavy', 1);
    return set(out, armed ? 'cleave' : 'heavy', v.chargeDamage, v.chargeKnock, 1);
  }

  if (!armed && (intent.attackPressed || intent.attackHeld) && f.jabCooldown <= 0) {
    const step = f.comboTimer > 0 ? f.combo : 0;
    f.jabCooldown = v.jabInterval;
    f.combo = (step + 1) % 3;
    f.comboTimer = step === 2 ? 0 : v.comboWindow;
    events.push(step % 2 === 0 ? 'jabL' : 'jabR', step);
    return step === 2 ? set(out, 'finisher', v.finisherDamage, v.finisherKnock) : set(out, 'jab', v.jabDamage, v.jabKnock);
  }
  return false;
}

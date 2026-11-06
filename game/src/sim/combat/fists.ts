// M1 step 6 — what the fists do this tick: the jab combo (hold to keep punching) and the charged punch on release (a
// weapon's since Update 0.3.5).
// M2 — holding a weapon (`armed`), left click is the weapon's (weapons/swing.ts) and the charge lets go a pierce.
// Update 0.0.10 — the quick punch (F) is gone (the designer).
// Update 0.3.5 (the designer: "no more heavy punches from fists, now right click is parry … it still has to time the
// hit with the projectile properly") — barehanded, right click held is the block (no charged punch); its press opens the
// parry's window (Parry window, s), and another press only once Parry cooldown has passed. Holding on doesn't parry:
// the press has to be timed. A weapon's right click charges as before.
// Update 0.3.6 (the designer: "when I want to parry, it is going to be like 0.2 sec before I go back to gameplay … do the
// quick animation and then continue gameplay") — no block held: a press opens the window (no jabs while it's open) and
// that's all; held on, the fists go on as ever. A press then waits Parry retry; a parry that lands, Parry cooldown ("4
// sec cooldown"; sim/combat/step.ts).
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
  /** Update 0.2.21 — a click while the fists are clasped for a slam: it lands as you do (sim/combat/step.ts). */
  slamClick: boolean;
  /** Update 0.3.5 — barehanded, right click held last tick (Update 0.3.6: only to tell a press); the parry's window
   *  left (s), and the wait till the next (s). */
  parryHeld: boolean;
  parryWindow: number;
  parryCooldown: number;
  /** Update 0.3.10 — a melee blow parried this tick (meleeParry.ts): the long wait starts (step.ts). */
  parried: boolean;
  /** Update 0.3.58 — the parry that just landed took a Drowned King's head: its short wait (step.ts). */
  quick: boolean;
}

/** Update 0.3.5 — how long a press of the parry stays open and the wait after it (s: Hair Trigger and Giant Killer,
 *  Fate Cards, change them). Update 0.3.6 — `retry`: after a press; `cooldown`: after a parry that lands. */
export interface ParryTimes {
  window: number;
  retry: number;
  cooldown: number;
}

export interface CombatIntent {
  attackHeld: boolean;
  attackPressed: boolean;
  heavyHeld: boolean;
  /** M2 — Q: throw the held weapon; E: pick one up. */
  throwPressed: boolean;
  /** Update 0.2.4 — R: reload the gun in hand. */
  reloadPressed: boolean;
  interactPressed: boolean;
  /** Update 0.0.17 — a weapon slot picked (index; −1: none). */
  slotPressed: number;
  /** Update 0.0.16 — the next key you carry, in front of a chest. */
  switchKeyPressed: boolean;
  /** Update 0.2.8 — the dash key, pinned by the Velociraptor (pin.ts: a dash in a bite's glow twists you out of it). */
  dodgePressed: boolean;
  yaw: number;
  pitch: number;
}

export type PunchKind = 'jab' | 'finisher' | 'heavy' | 'slash' | 'pierce';

export interface Punch {
  kind: PunchKind;
  damage: number;
  knock: number;
  /** 1 for a charged punch or pierce, 0 otherwise. */
  charge: number;
  /** M2 — how far it reaches from the eye (m) and its sweep's radius (a sword's is wider than a fist's). */
  reach: number;
  radius: number;
}

export function createFists(): FistState {
  return { combo: 0, comboTimer: 0, jabCooldown: 0, charging: false, charge: 0, chargeReady: false, slamClick: false, parryHeld: false, parryWindow: 0, parryCooldown: 0, parried: false, quick: false };
}

export function emptyCombatIntent(): CombatIntent {
  return { attackHeld: false, attackPressed: false, heavyHeld: false, throwPressed: false, reloadPressed: false, interactPressed: false, slotPressed: -1, switchKeyPressed: false, dodgePressed: false, yaw: 0, pitch: 0 };
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
 *  weapon (no jabs; a full charge lets go a 'pierce', which the caller turns into the weapon's). Update 0.2.15 —
 *  `chargeRate`: how fast the charge fills (Hair Trigger's ×2). Update 0.3.5 — `parry`: the parry's window and wait
 *  (barehanded, right click is the parry, not a charged punch). */
export function updateFists(f: FistState, intent: CombatIntent, events: EventQueue<CombatEvent>, dt: number, out: Punch, armed = false, rate = 1, chargeRate = 1, parry: ParryTimes = { window: FISTS.v.parryWindow, retry: FISTS.v.parryRetry, cooldown: FISTS.v.parryCooldown }): boolean {
  const v = FISTS.v;
  f.jabCooldown = Math.max(0, f.jabCooldown - dt);
  f.comboTimer = Math.max(0, f.comboTimer - dt);
  f.parryWindow = Math.max(0, f.parryWindow - dt);
  f.parryCooldown = Math.max(0, f.parryCooldown - dt);
  if (!armed) {
    f.charging = f.chargeReady = false;
    // Pressed (and ready): the parry's window opens.
    if (intent.heavyHeld && !f.parryHeld && f.parryCooldown <= 0) {
      f.parryWindow = parry.window;
      f.parryCooldown = parry.retry;
      events.push('guard');
    }
    f.parryHeld = intent.heavyHeld;
    if (f.parryWindow > 0) return false; // no jabs while it's open
  } else f.parryHeld = false;

  // Update 0.0.3 (the designer): right click is never a light punch. Hold it for the full charge time; letting go
  // sooner cancels. (A weapon's since Update 0.3.5.)
  if (armed && intent.heavyHeld) {
    if (!f.charging) {
      f.charging = true;
      f.charge = 0;
      events.push('chargeStart');
    } else {
      // (Update 0.2.15 — `chargeRate`: Hair Trigger fills it quicker.)
      f.charge = Math.min(v.chargeTime, f.charge + dt * chargeRate);
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
    events.push('pierce', 1);
    return set(out, 'pierce', v.chargeDamage, v.chargeKnock, 1);
  }

  if (!armed && (intent.attackPressed || intent.attackHeld) && f.jabCooldown <= 0) {
    const step = f.comboTimer > 0 ? f.combo : 0;
    // Update 0.0.17 — green rings make jabs come quicker.
    f.jabCooldown = v.jabInterval / rate;
    f.combo = (step + 1) % 3;
    f.comboTimer = step === 2 ? 0 : v.comboWindow;
    events.push(step % 2 === 0 ? 'jabL' : 'jabR', step);
    return step === 2 ? set(out, 'finisher', v.finisherDamage, v.finisherKnock) : set(out, 'jab', v.jabDamage, v.jabKnock);
  }
  return false;
}

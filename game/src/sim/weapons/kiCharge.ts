// Update 0.1.4 — the Grimoire's charge (the designer: "like a Ki blast … it costs seconds and weapon durability").
// Hold right click: the fireball builds on your palm for as long as you hold it. Each Charge step held burns a use, up to
// Max charges (or until the book has none left: then it stops growing). Letting go casts it (a quick tap: a plain
// fireball, one use). Its power grows with the time held: at the Big charge it's massive (its burst reaches about half a
// room), at the full charge twice that (the whole room). Pure.
import { WEAPONS } from '../../tuning/weapons';
import type { CombatIntent } from '../combat/fists';
import type { CombatState } from '../combat/state';
import type { HeldWeapon } from './weapons';

export interface KiCharge {
  charging: boolean;
  /** Seconds held (it stops growing at the full charge, or when the book can't pay for more). */
  t: number;
  /** Uses burnt so far. */
  paid: number;
}

/** What a fireball charged for `t` s does. */
export interface KiPower {
  /** Damage to what it hits, and to what its burst reaches. */
  damage: number;
  splash: number;
  /** Its burst's reach, and its own size: how close it must pass a target to hit it (m). */
  burst: number;
  size: number;
  speed: number;
  knock: number;
}

/** A plain fireball's size (m). */
export const FIRE_SIZE = 0.3;

export const createKi = (): KiCharge => ({ charging: false, t: 0, paid: 0 });

/** Seconds of the full charge, and of the big one. */
export const kiFull = () => WEAPONS.v.kiStep * WEAPONS.v.kiCharges;
export const kiMid = () => WEAPONS.v.kiStep * Math.min(WEAPONS.v.kiMidCharges, WEAPONS.v.kiCharges);

/** The power of a charge of `t` s: a plain fireball's at 0, the big one's at the Big charge, the full one's at the full
 *  charge, in a straight line between. */
export function kiPower(t: number, out: KiPower): KiPower {
  const v = WEAPONS.v;
  const full = kiFull();
  const mid = kiMid();
  const c = Math.max(0, Math.min(t, full));
  // `lo` → `hi` over the stretch it's in.
  const late = c > mid && full > mid;
  const k = late ? (c - mid) / (full - mid) : mid > 0 ? c / mid : 1;
  const pick = (base: number, atMid: number, atFull: number) => (late ? atMid + (atFull - atMid) * k : base + (atMid - base) * k);
  const scale = pick(1, v.kiMidDamage, v.kiFullDamage);
  out.damage = v.fireDamage * scale;
  out.splash = v.fireSplash * scale;
  out.burst = pick(v.fireRadius, v.kiMidBurst, v.kiFullBurst);
  out.size = pick(FIRE_SIZE, v.kiMidSize, v.kiFullSize);
  out.speed = pick(v.fireSpeed, v.kiMidSpeed, v.kiFullSpeed);
  out.knock = v.fireKnock + (v.kiFullKnock - v.fireKnock) * (full > 0 ? c / full : 1);
  return out;
}

/** Right click with the Grimoire. Returns true the tick it's let go (cast it now, charged `ki.t` s). */
export function updateKi(state: CombatState, w: HeldWeapon, intent: CombatIntent, dt: number): boolean {
  const ki = state.ki;
  const v = WEAPONS.v;
  if (!ki.charging) {
    if (!intent.heavyHeld || w.uses <= 0) return false;
    ki.charging = true;
    ki.t = ki.paid = 0;
    state.events.push('kiStart');
    return false;
  }
  if (!intent.heavyHeld) {
    ki.charging = false;
    return true;
  }
  // It grows while the book can pay for the next charge; each one it reaches burns a use.
  const step = Math.max(1e-3, v.kiStep);
  const cap = Math.min(kiFull(), (ki.paid + (w.uses > 0 ? 1 : 0)) * step);
  ki.t = Math.min(cap, ki.t + dt);
  while (ki.paid < v.kiCharges && w.uses > 0 && ki.t >= (ki.paid + 1) * step - 1e-9) {
    ki.paid++;
    w.uses--;
    state.events.push('kiCharge', ki.paid);
  }
  return false;
}

/** The charge dropped without a cast (the weapon thrown or swapped away, an execution): what it burnt is lost. */
export function dropKi(ki: KiCharge) {
  ki.charging = false;
  ki.t = ki.paid = 0;
}

/** The mouse was freed (the game paused): a charge in progress is called off. The fists' charge is cancelled; the
 *  Grimoire's gives back what it burnt. */
export function cancelCharges(state: CombatState) {
  state.fists.charging = false;
  state.fists.chargeReady = false;
  state.blade.charging = state.blade.full = false;
  if (state.ki.charging && state.weapon) state.weapon.uses += state.ki.paid;
  dropKi(state.ki);
}

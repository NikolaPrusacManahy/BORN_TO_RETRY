// Update 0.3.20 — what the HUD's controls show, bottom right (the designer: "display the controls like in the game Blood
// rush … display jab control, parry and it's cooldown like a filling effect … use the UI logo to make it looks like it
// is filling like a circle and shows how long you wait for a parry"; "Ground pound … display it to bottom right"): the
// parry's and the ground pound's keys (the jab's is the HUD's attackKey), how far the parry's wait has filled back
// (0..1, 1: ready), no parry with a weapon in hand, and whether a ground pound can start now (set by the run).
import type { CombatState } from '../sim/combat/state';

export interface ControlsHud {
  heavyKey: string;
  slamKey: string;
  parryFill: number;
  parryOff: boolean;
  slamReady: boolean;
}

/** The parry's fill moves in steps of this share (a 4 s wait: 10 a second). */
const FILL_STEP = 40;

export const createControlsHud = (): ControlsHud => ({ heavyKey: '', slamKey: '', parryFill: 1, parryOff: false, slamReady: false });

/** The parry's wait as it was set (s), to fill against (the short one after a press, the long one after a parry), and
 *  what was left of it last frame. */
export interface ParryClock {
  full: number;
  last: number;
}

export const createParryClock = (): ParryClock => ({ full: 0, last: 0 });

/** How far the parry's wait has filled back (0..1, 1: ready), from its time left (s); a wait set anew starts it over. */
export function parryFill(left: number, clock: ParryClock): number {
  if (left > clock.last + 1e-6) clock.full = left;
  clock.last = left;
  if (left <= 0 || clock.full <= 0) return 1;
  return Math.min(1, Math.floor((1 - left / clock.full) * FILL_STEP) / FILL_STEP);
}

/** This frame's (into `out`). */
export function controlsHud(combat: CombatState, heavyKey: string, slamKey: string, slamReady: boolean, clock: ParryClock, out: ControlsHud): ControlsHud {
  out.heavyKey = heavyKey;
  out.slamKey = slamKey;
  out.parryFill = parryFill(combat.fists.parryCooldown, clock);
  out.parryOff = combat.weapon !== null;
  out.slamReady = slamReady;
  return out;
}

/** The HUD shows these already. */
export const sameControls = (cur: ControlsHud, c: ControlsHud) =>
  cur.heavyKey === c.heavyKey && cur.slamKey === c.slamKey && cur.parryFill === c.parryFill && cur.parryOff === c.parryOff && cur.slamReady === c.slamReady;

// Update 0.2.8 — what the HUD shows of the Velociraptor's moves: sand in your eyes (0..1, fading as it wears off), your
// dash taken by its screech, and its pin (your dodges, −1 while you're free; its bite glowing: dash now; a dash wasted
// too early; how the last pin ended, while its flash lasts).
// Update 0.2.10 — and floor 5's Squidle's ink over your view (0..1, fading as it wears off).
import { pinGlowing } from '../sim/combat/pin';
import type { CombatState } from '../sim/combat/state';
import type { PlayerState } from '../sim/player/state';
import { DINO } from '../tuning/dino';
import { FOES5 } from '../tuning/foes5';

export interface RaptorHud {
  blind: number;
  dashLocked: boolean;
  pinDodges: number;
  pinNeed: number;
  pinGlow: boolean;
  pinWasted: boolean;
  pinEnd: '' | 'free' | 'bitten';
  ink: number;
}

/** How long the end of a pin flashes on screen (s); the sand's fade moves in steps of this share. */
const PIN_FLASH = 1.1;
const BLIND_STEP = 20;

export const createRaptorHud = (): RaptorHud => ({ blind: 0, dashLocked: false, pinDodges: -1, pinNeed: 0, pinGlow: false, pinWasted: false, pinEnd: '', ink: 0 });

/** This frame's (into `out`). */
export function raptorHud(p: PlayerState, combat: CombatState, out: RaptorHud): RaptorHud {
  const pin = combat.pin;
  out.blind = p.dead || p.blind <= 0 ? 0 : Math.ceil(Math.min(1, p.blind / 2) * BLIND_STEP) / BLIND_STEP;
  out.dashLocked = p.dashLock > 0 && !p.dead;
  out.ink = p.dead || p.ink <= 0 ? 0 : Math.ceil(Math.min(1, p.ink / Math.max(0.1, FOES5.v.inkTime)) * BLIND_STEP) / BLIND_STEP;
  out.pinDodges = pin.on ? pin.dodges : -1;
  out.pinNeed = Math.round(DINO.v.pinDodges);
  out.pinGlow = pinGlowing(pin);
  out.pinWasted = pin.on && pin.wasted;
  out.pinEnd = !pin.on && pin.since < PIN_FLASH ? pin.end : '';
  return out;
}

/** The HUD shows these already. */
export const sameRaptor = (cur: RaptorHud, r: RaptorHud) =>
  cur.blind === r.blind && cur.dashLocked === r.dashLocked && cur.pinDodges === r.pinDodges && cur.pinNeed === r.pinNeed && cur.pinGlow === r.pinGlow && cur.pinWasted === r.pinWasted && cur.pinEnd === r.pinEnd && cur.ink === r.ink;

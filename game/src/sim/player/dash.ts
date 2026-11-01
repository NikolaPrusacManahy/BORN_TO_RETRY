// M1 — the dash: a flat burst in the direction you're moving (or facing), invincible for its length.
// Charges refill one at a time.
// Update 0.2.8 — not while the Velociraptor's screech has taken it (PlayerState.dashLock).
// Update 0.2.16 — Fate Cards: Restless (more charges, refilling quicker), Giant Killer (free dashes a while).
import type { Vector3 } from 'three';
import { CARDS } from '../../tuning/cards';
import { DASH } from '../../tuning/movement';
import { bears } from '../cards/cards';
import { applyGravity } from './air';
import type { PlayerState } from './state';
import { endSlide } from './slide';

/** Update 0.2.16 — your dash charges (Restless: more). */
export const dashMaxOf = (p: PlayerState) => DASH.v.charges + (bears(p, 'restless') ? Math.round(CARDS.v.restless) : 0);

export function refillDash(p: PlayerState, dt: number) {
  const max = dashMaxOf(p);
  if (p.dashCharges > max) p.dashCharges = max;
  const rate = bears(p, 'restless') ? 1 + CARDS.v.restlessRefill : 1;
  if (p.dashTime <= 0 && p.dashCharges < max) p.dashCharges = Math.min(max, p.dashCharges + (dt * rate) / DASH.v.refillTime);
}

/** `wish`: wanted direction (length 1 or 0). Falls back to facing. Returns true if a dash started. */
export function tryStartDash(p: PlayerState, pressed: boolean, wish: Vector3): boolean {
  const free = p.freeDash > 0;
  if (!pressed || (p.dashCharges < 1 && !free) || p.dashTime > 0 || p.dashLock > 0) return false;
  if (!free) p.dashCharges -= 1;
  p.dashTime = DASH.v.duration;
  p.invuln = Math.max(p.invuln, DASH.v.duration);
  if (wish.x !== 0 || wish.z !== 0) p.dashDir.set(wish.x, 0, wish.z);
  else p.dashDir.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  if (p.sliding) endSlide(p);
  p.slamming = false;
  p.vel.y = 0;
  p.events.push('dash');
  return true;
}

export function updateDash(p: PlayerState, dt: number) {
  p.vel.x = p.dashDir.x * DASH.v.speed;
  p.vel.z = p.dashDir.z * DASH.v.speed;
  if (DASH.v.gravity > 0) applyGravity(p.vel, dt, DASH.v.gravity);
  else p.vel.y = 0;
  p.dashTime -= dt;
  if (p.dashTime <= 0) endDash(p);
}

/** Ends the dash, leaving the exit speed in the dash direction. */
export function endDash(p: PlayerState) {
  p.dashTime = 0;
  p.vel.x = p.dashDir.x * DASH.v.exitSpeed;
  p.vel.z = p.dashDir.z * DASH.v.exitSpeed;
}

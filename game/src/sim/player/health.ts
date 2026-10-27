// M1 step 8 — the player's health: damage (a dash or the moment after a hit stops it), blood heal from damage
// you deal up close, and death. 100 HP, no regeneration. Pure: everything it does shows up as events.
import { HEALTH } from '../../tuning/health';
import { LAB } from '../../tuning/lab';
import type { PlayerState } from './state';

/** Counts the hurt invincibility down. Call once per tick. */
export function updateHealth(p: PlayerState, dt: number) {
  p.hurtTime = Math.max(0, p.hurtTime - dt);
}

/** Can something hurt the player right now? */
export function canHurt(p: PlayerState): boolean {
  return !p.dead && p.invuln <= 0 && p.hurtTime <= 0 && LAB.v.god < 1;
}

/** Deals `amount` to the player. Returns true if it landed. Pushes 'hurt', then 'death' if it was the last of you. */
export function damagePlayer(p: PlayerState, amount: number): boolean {
  if (!canHurt(p) || amount <= 0) return false;
  p.hp = Math.max(0, p.hp - amount);
  p.hurtTime = HEALTH.v.hurtInvuln;
  p.events.push('hurt', amount);
  if (p.hp <= 0) die(p);
  return true;
}

/** Heals up to the max. Returns how much was healed. */
export function healPlayer(p: PlayerState, amount: number): number {
  if (p.dead || amount <= 0) return 0;
  const before = p.hp;
  p.hp = Math.min(HEALTH.v.maxHp, p.hp + amount);
  return p.hp - before;
}

/** Blood heal: damage you deal within range heals a share of it. Returns how much was healed. */
export function bloodHeal(p: PlayerState, dealt: number, distance: number): number {
  if (distance > HEALTH.v.bloodRange) return 0;
  return healPlayer(p, dealt * HEALTH.v.bloodHeal);
}

/** Death that no invincibility stops (falling out of the world). */
export function killPlayer(p: PlayerState) {
  if (p.dead || LAB.v.god >= 1) return;
  p.hp = 0;
  die(p);
}

function die(p: PlayerState) {
  p.dead = true;
  p.events.push('death');
}

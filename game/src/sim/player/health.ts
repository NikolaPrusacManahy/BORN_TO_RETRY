// M1 step 8 — the player's health: damage (a dash or the moment after a hit stops it), healing, and death. 100 HP, no
// regeneration. Pure: everything it does shows up as events.
// Update 0.0.13 — no blood heal (the designer: you only heal from the shop). The shield (armour plates) takes a hit
// before your health does.
// Update 0.0.17 — your max health is the base plus what red rings add (PlayerState.hpBonus).
import { HEALTH } from '../../tuning/health';
import { ITEMS } from '../../tuning/items';
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

/** Deals `amount` to the player: the shield takes what it can ('shieldHit', then 'shieldBreak' if it's gone), your
 *  health the rest ('hurt', then 'death' if it was the last of you). Returns true if it landed. */
export function damagePlayer(p: PlayerState, amount: number): boolean {
  if (!canHurt(p) || amount <= 0) return false;
  p.hurtTime = HEALTH.v.hurtInvuln;
  const blocked = Math.min(p.shield, amount);
  if (blocked > 0) {
    p.shield -= blocked;
    p.events.push('shieldHit', blocked);
    if (p.shield <= 0) p.events.push('shieldBreak');
  }
  const rest = amount - blocked;
  if (rest <= 0) return true;
  p.hp = Math.max(0, p.hp - rest);
  p.events.push('hurt', rest);
  if (p.hp <= 0) die(p);
  return true;
}

/** Update 0.0.17 — your max health now. */
export const maxHpOf = (p: PlayerState) => HEALTH.v.maxHp + p.hpBonus;

/** Heals up to the max. Returns how much was healed. */
export function healPlayer(p: PlayerState, amount: number): number {
  if (p.dead || amount <= 0) return 0;
  const before = p.hp;
  p.hp = Math.min(maxHpOf(p), p.hp + amount);
  return p.hp - before;
}

/** The most shield you can carry. */
export const maxShield = () => HEALTH.v.maxHp * ITEMS.v.shieldMax;

/** Update 0.0.13 — adds shield up to the most you can carry. Returns how much was added. */
export function addShield(p: PlayerState, amount: number): number {
  if (p.dead || amount <= 0) return 0;
  const before = p.shield;
  p.shield = Math.min(maxShield(), p.shield + amount);
  return p.shield - before;
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

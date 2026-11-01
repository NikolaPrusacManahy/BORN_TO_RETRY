// M1 step 8 — the player's health: damage (a dash or the moment after a hit stops it), healing, and death. 100 HP, no
// regeneration. Pure: everything it does shows up as events.
// Update 0.0.13 — no blood heal (the designer: you only heal from the shop). The shield (armour plates) takes a hit
// before your health does.
// Update 0.0.17 — your max health is the base plus what red rings add (PlayerState.hpBonus).
// Update 0.0.18 — poison (the snake's bite, the wasp's sting): a little damage a second for a while, straight off your
// health (the shield doesn't stop it, nor does a dash); a new dose starts it over.
// Update 0.1.14 — each hurt says what did it (PlayerState.hurtBy), for the death screen; poison, who poisoned you.
// Update 0.2.8 — the Velociraptor's sand in your eyes and its screech's dash lock wear off here too.
// Update 0.2.16 — Fate Cards: Hard Head (every 10th hit does nothing), Born Again (the first death burns the card
// instead), All In (your max health halved); the hits you take are counted (Blood Money's coins: sim/cards/cardMoves.ts).
import { CARDS } from '../../tuning/cards';
import { HEALTH } from '../../tuning/health';
import { bears } from '../cards/cards';
import { ITEMS } from '../../tuning/items';
import { LAB } from '../../tuning/lab';
import type { Cause, PlayerState } from './state';

/** Counts the hurt invincibility down (and the sand, and the dash lock), and the poison does its damage. Call once per
 *  tick. */
export function updateHealth(p: PlayerState, dt: number) {
  p.hurtTime = Math.max(0, p.hurtTime - dt);
  p.blind = Math.max(0, p.blind - dt);
  p.ink = Math.max(0, p.ink - dt);
  p.dashLock = Math.max(0, p.dashLock - dt);
  if (p.poison <= 0 || p.dead) return;
  p.poison = Math.max(0, p.poison - dt);
  if (LAB.v.god >= 1) return;
  p.hp = Math.max(0, p.hp - p.poisonDps * dt);
  if (p.hp <= 0) {
    p.hurtBy = p.poisonBy;
    fall(p);
  }
}

/** Update 0.0.18 — poisons you for `secs` at `dps` (starting it over; the stronger dose wins). */
export function poisonPlayer(p: PlayerState, dps: number, secs: number, by: Cause | null = null) {
  if (p.dead || LAB.v.god >= 1) return;
  p.poisonBy = by;
  if (p.poison <= 0) p.events.push('poisoned');
  p.poison = Math.max(p.poison, secs);
  p.poisonDps = Math.max(p.poison > 0 ? p.poisonDps : 0, dps);
}

/** Can something hurt the player right now? */
export function canHurt(p: PlayerState): boolean {
  return !p.dead && p.invuln <= 0 && p.hurtTime <= 0 && LAB.v.god < 1;
}

/** Deals `amount` to the player: the shield takes what it can ('shieldHit', then 'shieldBreak' if it's gone), your
 *  health the rest ('hurt', then 'death' if it was the last of you). Returns true if it landed. */
export function damagePlayer(p: PlayerState, amount: number, by: Cause | null = null): boolean {
  if (!canHurt(p) || amount <= 0) return false;
  p.hurtTime = HEALTH.v.hurtInvuln;
  // (Hard Head: every so many hits does nothing at all.)
  if (bears(p, 'hardHead') && ++p.shrug >= Math.round(CARDS.v.hardHead)) {
    p.shrug = 0;
    p.events.push('shrug');
    return false;
  }
  p.hits++;
  const blocked = Math.min(p.shield, amount);
  if (blocked > 0) {
    p.shield -= blocked;
    p.events.push('shieldHit', blocked);
    if (p.shield <= 0) p.events.push('shieldBreak');
  }
  const rest = amount - blocked;
  if (rest <= 0) return true;
  p.hurtBy = by;
  p.hp = Math.max(0, p.hp - rest);
  p.events.push('hurt', rest);
  if (p.hp <= 0) fall(p);
  return true;
}

/** Update 0.0.17 — your max health now. Update 0.2.16 — All In (a Fate Card) halves it. */
export const maxHpOf = (p: PlayerState) => (HEALTH.v.maxHp + p.hpBonus) * (bears(p, 'allIn') ? 0.5 : 1);

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
export function killPlayer(p: PlayerState, by: Cause | null = null) {
  if (p.dead || LAB.v.god >= 1) return;
  p.hurtBy = by;
  p.hp = 0;
  die(p);
}

function die(p: PlayerState) {
  p.dead = true;
  p.events.push('death');
}

/** Update 0.2.16 — out of health: dead, unless you carry Born Again (a Fate Card): it burns instead, and you're left on
 *  1 health, untouchable a while. */
function fall(p: PlayerState) {
  if (!bears(p, 'bornAgain')) {
    die(p);
    return;
  }
  p.cards.delete('bornAgain');
  p.hp = 1;
  p.invuln = Math.max(p.invuln, CARDS.v.bornAgain);
  p.events.push('bornAgain');
}

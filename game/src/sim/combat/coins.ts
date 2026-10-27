// Update 0.0.12 — coins (design §7; the designer: each enemy gives an amount of coins). A kill bursts its coins out
// (seeded directions); they bounce for Coin delay, then fly to your chest faster and faster and are yours on
// touching you. Pure.
import { Vector3 } from 'three';
import type { Rng } from '../../core/rng';
import type { EventQueue } from '../../core/eventQueue';
import { MONEY } from '../../tuning/money';
import type { PlayerState } from '../player/state';
import type { CombatEvent } from './state';

export interface Coin {
  alive: boolean;
  pos: Vector3;
  vel: Vector3;
  /** Seconds since it burst out; the floor it bounces on. */
  t: number;
  floor: number;
}

export const COIN_POOL = 64;
const GRAVITY = 22;
/** Where on you a coin flies to (m above your feet). */
const CHEST = 1.1;

const to = new Vector3();

export function createCoins(): Coin[] {
  return Array.from({ length: COIN_POOL }, () => ({ alive: false, pos: new Vector3(), vel: new Vector3(), t: 0, floor: 0 }));
}

/** `count` coins burst out of `at` (feet). If the pool is full the rest go straight to `money` (never lost). Returns
 *  the coins it couldn't place. */
export function burstCoins(coins: Coin[], at: Vector3, count: number, rng: Rng): number {
  let left = count;
  for (const c of coins) {
    if (left <= 0) break;
    if (c.alive) continue;
    const a = rng() * Math.PI * 2;
    const out = MONEY.v.coinPop * (0.4 + 0.6 * rng());
    c.alive = true;
    c.pos.set(at.x, at.y + 1, at.z);
    c.vel.set(Math.cos(a) * out, MONEY.v.coinPop * (0.8 + 0.6 * rng()), Math.sin(a) * out);
    c.t = 0;
    c.floor = at.y;
    left--;
  }
  return left;
}

/** Moves the coins; the ones that reach you add to the money. Returns the money after. */
export function updateCoins(coins: Coin[], player: PlayerState, money: number, events: EventQueue<CombatEvent>, dt: number): number {
  const v = MONEY.v;
  for (const c of coins) {
    if (!c.alive) continue;
    c.t += dt;
    if (c.t < v.coinDelay || player.dead) {
      c.vel.y -= GRAVITY * dt;
      c.pos.addScaledVector(c.vel, dt);
      if (c.pos.y < c.floor + 0.15) {
        c.pos.y = c.floor + 0.15;
        c.vel.y = Math.abs(c.vel.y) * 0.4;
        c.vel.x *= 0.6;
        c.vel.z *= 0.6;
      }
      continue;
    }
    // Pulled to you, faster the longer it flies.
    to.set(player.pos.x, player.pos.y + CHEST, player.pos.z).sub(c.pos);
    const dist = to.length();
    if (dist <= v.coinReach) {
      c.alive = false;
      money++;
      events.push('coin', money, c.pos.x, c.pos.y, c.pos.z);
      continue;
    }
    const speed = Math.min(v.coinPull, 4 + (c.t - v.coinDelay) * v.coinPull * 3);
    c.vel.copy(to).multiplyScalar(speed / dist);
    c.pos.addScaledVector(c.vel, Math.min(dt, dist / speed));
  }
  return money;
}

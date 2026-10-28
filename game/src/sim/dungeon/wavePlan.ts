// Update 0.0.12 — a fight room's waves, bought from a budget that grows with how deep the room is and the floor you're
// on: grunts are cheap, spitters dearer, brutes dearest (and only from the third room). Update 0.0.13 — bigger budgets
// for rooms twice the size; waves picked from every kind the room may have (weighted), the leaper and the stinger from
// the second room, the wraith and the brute from the third (all of them from floor 2).
// Update 0.0.16 (moved out of roomLoop.ts) — each room's waves are planned when the floor is laid out (its own seed),
// so the floor knows which rooms hold a Yeti (the brute): those get a chest, and the Yeti carries its key. Pure.
import type { Rng } from '../../core/rng';
import { ENEMY_KINDS, EnemyKind } from '../enemies/kinds';

/** No more than this many in one wave. */
const WAVE_CAP = 8;
export const COST: Record<EnemyKind, number> = { grunt: 1, spitter: 2, brute: 4, leaper: 2, stinger: 2, wraith: 3, demon: 99 };
/** How often each kind is picked, and the first room (on floor 1) it comes in. **(placeholders)** The Demon is never
 *  bought: it's the boss room's. */
const WEIGHT: Record<EnemyKind, number> = { grunt: 4, spitter: 2, brute: 1, leaper: 1.5, stinger: 2, wraith: 1, demon: 0 };
const FROM: Record<EnemyKind, number> = { grunt: 1, spitter: 1, brute: 3, leaper: 2, stinger: 2, wraith: 3, demon: Infinity };

/** A room's fight: its budget (enemy cost to spend) and how many waves it comes in. */
export function roomBudget(depth: number, floor: number): { budget: number; waves: number } {
  const budget = 6 + 3 * depth + 4 * (floor - 1);
  return { budget, waves: budget >= 18 ? 3 : 2 };
}

/** The kinds of one wave, bought from `budget` (seeded). */
export function buyWave(budget: number, depth: number, floor: number, rng: Rng): EnemyKind[] {
  const out: EnemyKind[] = [];
  let left = budget;
  const can = (k: EnemyKind) => WEIGHT[k] > 0 && (floor >= 2 || depth >= FROM[k]) && COST[k] <= left;
  while (left > 0 && out.length < WAVE_CAP) {
    let total = 0;
    for (const k of ENEMY_KINDS) if (can(k)) total += WEIGHT[k];
    let roll = rng() * total;
    let kind: EnemyKind = 'grunt';
    for (const k of ENEMY_KINDS) {
      if (!can(k)) continue;
      kind = k;
      roll -= WEIGHT[k];
      if (roll < 0) break;
    }
    out.push(kind);
    left -= COST[kind];
  }
  return out;
}

/** A fight room's waves, dearest first in each (brutes get the spots furthest from you). */
export function planWaves(depth: number, floor: number, rng: Rng): EnemyKind[][] {
  const { budget, waves } = roomBudget(depth, floor);
  return Array.from({ length: waves }, () => buyWave(Math.ceil(budget / waves), depth, floor, rng).sort((a, b) => COST[b] - COST[a]));
}

/** A Yeti (the brute) comes in these waves. */
export const hasYeti = (waves: readonly EnemyKind[][]) => waves.some((w) => w.includes('brute'));

// Update 0.0.12 — a fight room's waves, bought from a budget that grows with how deep the room is and the floor you're
// on: grunts are cheap, spitters dearer, brutes dearest (and only from the third room). Update 0.0.13 — bigger budgets
// for rooms twice the size; waves picked from every kind the room may have (weighted), the leaper and the stinger from
// the second room, the wraith and the brute from the third (all of them from floor 2).
// Update 0.0.16 (moved out of roomLoop.ts) — each room's waves are planned when the floor is laid out (its own seed),
// so the floor knows which rooms hold a Yeti (the brute): those get a chest, and the Yeti carries its key. Pure.
// Update 0.0.18 — each floor its own enemies (the designer): floor 2 keeps floor 1's small ones and adds the Slime, the
// Frog, the Snake and the Wasp; its big ones are the Spider and the Blue Demon (no Yeti). Floor 3 has floor 2's for now.
// Every big one is a mini boss: its room has a chest and it carries the key.
import type { Rng } from '../../core/rng';
import { ENEMY_KINDS, EnemyKind, MINI_BOSSES } from '../enemies/kinds';

/** No more than this many in one wave. */
const WAVE_CAP = 8;
export const COST: Record<EnemyKind, number> = { grunt: 1, spitter: 2, brute: 4, leaper: 2, stinger: 2, wraith: 3, demon: 99, slime: 1, frog: 2, snake: 1, wasp: 2, spider: 4, blueDemon: 4, dragon: 99 };
/** How often each kind is picked, and the first room (on floor 1) it comes in. **(placeholders)** The Demon is never
 *  bought: it's the boss room's. */
const WEIGHT: Record<EnemyKind, number> = { grunt: 4, spitter: 2, brute: 1, leaper: 1.5, stinger: 2, wraith: 1, demon: 0, slime: 2, frog: 1.5, snake: 2, wasp: 1.5, spider: 0.6, blueDemon: 0.6, dragon: 0 };
const FROM: Record<EnemyKind, number> = { grunt: 1, spitter: 1, brute: 3, leaper: 2, stinger: 2, wraith: 3, demon: Infinity, slime: 1, frog: 1, snake: 1, wasp: 1, spider: 1, blueDemon: 1, dragon: Infinity };
/** Each floor's enemies (index: the floor; past the last, the last's). */
const ROSTER: readonly (readonly EnemyKind[])[] = [
  [],
  ['grunt', 'spitter', 'brute', 'leaper', 'stinger', 'wraith'],
  ['grunt', 'spitter', 'leaper', 'stinger', 'wraith', 'slime', 'frog', 'snake', 'wasp', 'spider', 'blueDemon'],
];

/** The enemies floor `floor` sends. */
export const rosterOf = (floor: number) => ROSTER[Math.max(1, Math.min(floor, ROSTER.length - 1))];

/** A room's fight: its budget (enemy cost to spend) and how many waves it comes in. */
export function roomBudget(depth: number, floor: number): { budget: number; waves: number } {
  const budget = 6 + 3 * depth + 4 * (floor - 1);
  return { budget, waves: budget >= 18 ? 3 : 2 };
}

/** The kinds of one wave, bought from `budget` (seeded). */
export function buyWave(budget: number, depth: number, floor: number, rng: Rng): EnemyKind[] {
  const out: EnemyKind[] = [];
  let left = budget;
  const roster = rosterOf(floor);
  const can = (k: EnemyKind) => WEIGHT[k] > 0 && roster.includes(k) && (floor >= 2 || depth >= FROM[k]) && COST[k] <= left;
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

/** Update 0.0.21 — spitters to stand on a room's perches, in every wave of a room with them. **(placeholder)** */
export const PERCHED = 2;

/** Update 0.0.21 — a room with `perches`: every wave brings spitters to stand on them (as many as it has, up to
 *  PERCHED). Rooms without perches are as planned. */
export function perchWaves(waves: EnemyKind[][], perches: number): EnemyKind[][] {
  const n = Math.min(perches, PERCHED);
  if (n > 0) for (const w of waves) for (let i = 0; i < n; i++) w.push('spitter');
  return waves;
}

/** A mini boss (a big one: the Yeti, the Spider, the Blue Demon) comes in these waves. */
export const hasYeti = (waves: readonly EnemyKind[][]) => waves.some((w) => w.some((k) => MINI_BOSSES.includes(k)));

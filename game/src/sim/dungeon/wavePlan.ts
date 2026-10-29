// Update 0.0.12 — a fight room's waves, bought from a budget that grows with how deep the room is and the floor you're
// on: grunts are cheap, spitters dearer, brutes dearest (and only from the third room). Update 0.0.13 — bigger budgets
// for rooms twice the size; waves picked from every kind the room may have (weighted), the leaper and the stinger from
// the second room, the wraith and the brute from the third (all of them from floor 2).
// Update 0.0.16 (moved out of roomLoop.ts) — each room's waves are planned when the floor is laid out (its own seed),
// so the floor knows which rooms hold a Yeti (the brute): those get a chest, and the Yeti carries its key. Pure.
// Update 0.0.18 — each floor its own enemies (the designer): floor 2 keeps floor 1's small ones and adds the Slime, the
// Frog, the Snake and the Wasp; its big ones are the Spider and the Blue Demon (no Yeti). Floor 3 has floor 2's for now.
// Every big one is a mini boss: its room has a chest and it carries the key.
// Update 0.1.1 (the designer: floor 1 starts at 8, then 11; floor 2 at 11, then 14, and so on) — a room's enemies are a
// count, not a budget (tuning/rooms.ts): 8, then 3 more for each room along the way and 3 more for each floor down.
// Update 0.1.16 (the designer: "2 more enemies every 2 floors, starting with floor 2") — 2 more every 2 floors down.
// Update 0.1.18 — floor 3 its own (the designer cut the Grunt, the Leaper and the Blue Demon from floor 2's): the Spider
// its only mini boss. Floors past it send floor 3's. Update 0.1.19 — and its own (the designer): the Skeleton, the
// Mushnub, and the Ninja (a mini boss beside the Spider).
// The kinds are picked as before (weighted, the floor's roster, floor 1's later kinds from their rooms), with at most
// Mini bosses a room of the big ones.
// Update 0.1.20 — a challenge room (the designer): Challenge: more enemies on top of its count, and always Challenge:
// mini bosses of the floor's (one in the first wave, the next in the last, and so on), no others.
import type { Rng } from '../../core/rng';
import { ENEMY_KINDS, EnemyKind, MINI_BOSSES } from '../enemies/kinds';
import { ROOMS } from '../../tuning/rooms';

export const COST: Record<EnemyKind, number> = { grunt: 1, spitter: 2, brute: 4, leaper: 2, stinger: 2, wraith: 3, demon: 99, slime: 1, frog: 2, snake: 1, wasp: 2, spider: 4, blueDemon: 4, dragon: 99, skeleton: 1, mushnub: 1, ninja: 4 };
/** How often each kind is picked, and the first room (on floor 1) it comes in. **(placeholders)** The Demon is never
 *  bought: it's the boss room's. */
const WEIGHT: Record<EnemyKind, number> = { grunt: 4, spitter: 2, brute: 1, leaper: 1.5, stinger: 2, wraith: 1, demon: 0, slime: 2, frog: 1.5, snake: 2, wasp: 1.5, spider: 0.6, blueDemon: 0.6, dragon: 0, skeleton: 3, mushnub: 3, ninja: 0.6 };
const FROM: Record<EnemyKind, number> = { grunt: 1, spitter: 1, brute: 3, leaper: 2, stinger: 2, wraith: 3, demon: Infinity, slime: 1, frog: 1, snake: 1, wasp: 1, spider: 1, blueDemon: 1, dragon: Infinity, skeleton: 1, mushnub: 1, ninja: 1 };
/** Each floor's enemies (index: the floor; past the last, the last's). */
const ROSTER: readonly (readonly EnemyKind[])[] = [
  [],
  ['grunt', 'spitter', 'brute', 'leaper', 'stinger', 'wraith'],
  ['grunt', 'spitter', 'leaper', 'stinger', 'wraith', 'slime', 'frog', 'snake', 'wasp', 'spider', 'blueDemon'],
  ['spitter', 'stinger', 'wraith', 'slime', 'frog', 'snake', 'wasp', 'spider', 'skeleton', 'mushnub', 'ninja'],
];

/** The enemies floor `floor` sends. */
export const rosterOf = (floor: number) => ROSTER[Math.max(1, Math.min(floor, ROSTER.length - 1))];

/** Update 0.1.1 — how many enemies the fight room `depth` rooms along floor `floor` sends. Update 0.1.16 — the floor's
 *  share steps up every `floorsApart` floors (floor 2 the first, with 2 apart). */
export function roomCount(depth: number, floor: number): number {
  const v = ROOMS.v;
  const steps = Math.floor(Math.max(1, floor) / Math.max(1, Math.round(v.floorsApart)));
  return v.baseCount + v.perRoom * Math.max(0, depth - 1) + v.perFloor * steps;
}

const isBig = (k: EnemyKind) => MINI_BOSSES.includes(k);

/** `count` enemies' kinds (seeded), no more than `big` of them mini bosses. */
export function buyWave(count: number, depth: number, floor: number, rng: Rng, big = Infinity): EnemyKind[] {
  const out: EnemyKind[] = [];
  const roster = rosterOf(floor);
  let bigs = 0;
  const can = (k: EnemyKind) => WEIGHT[k] > 0 && roster.includes(k) && (floor >= 2 || depth >= FROM[k]) && (!isBig(k) || bigs < big);
  while (out.length < count) {
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
    if (isBig(kind)) bigs++;
  }
  return out;
}

/** A fight room's waves (its count split over two, or three from 18), dearest first in each (brutes get the spots
 *  furthest from you). `challenge`: a challenge room's. */
export function planWaves(depth: number, floor: number, rng: Rng, challenge = false): EnemyKind[][] {
  const v = ROOMS.v;
  const n = roomCount(depth, floor) + (challenge ? Math.round(v.challengeExtra) : 0);
  const waves = n >= 18 ? 3 : 2;
  let bigs = 0;
  const plan = Array.from({ length: waves }, (_, w) => {
    const wave = buyWave(Math.floor(n / waves) + (w < n % waves ? 1 : 0), depth, floor, rng, challenge ? 0 : v.bigMax - bigs);
    bigs += wave.filter(isBig).length;
    return wave;
  });
  if (challenge) addMinis(plan, floor, rng);
  return plan.map((wave) => wave.sort((a, b) => COST[b] - COST[a]));
}

/** Update 0.1.20 — a challenge room's mini bosses (the floor's, by weight), each in place of a wave's cheapest: the
 *  first wave's, the last's, then the others'. */
function addMinis(plan: EnemyKind[][], floor: number, rng: Rng) {
  const minis = rosterOf(floor).filter(isBig);
  if (minis.length === 0) return;
  const order = [0, ...Array.from({ length: plan.length - 1 }, (_, i) => plan.length - 1 - i)];
  const total = minis.reduce((s, k) => s + WEIGHT[k], 0);
  for (let m = 0; m < Math.round(ROOMS.v.challengeMinis); m++) {
    const wave = plan[order[m % order.length]];
    let roll = rng() * total;
    const kind = minis.find((k) => (roll -= WEIGHT[k]) < 0) ?? minis[minis.length - 1];
    let at = -1;
    for (let i = 0; i < wave.length; i++) if (!isBig(wave[i]) && (at < 0 || COST[wave[i]] < COST[wave[at]])) at = i;
    if (at >= 0) wave[at] = kind;
    else wave.push(kind);
  }
}

/** Update 0.0.21 — spitters to stand on a room's perches, in every wave of a room with them. **(placeholder)** */
export const PERCHED = 2;

/** Update 0.0.21 — a room with `perches`: every wave brings spitters to stand on them (as many as it has, up to
 *  PERCHED). Rooms without perches are as planned. Update 0.1.1 — they take the place of the wave's cheapest (not
 *  added: the room's count stays). */
export function perchWaves(waves: EnemyKind[][], perches: number): EnemyKind[][] {
  const n = Math.min(perches, PERCHED);
  if (n <= 0) return waves;
  for (const w of waves) {
    let need = n - w.filter((k) => k === 'spitter').length;
    for (let i = w.length - 1; i >= 0 && need > 0; i--) {
      if (w[i] === 'spitter' || isBig(w[i])) continue;
      w[i] = 'spitter';
      need--;
    }
    w.sort((a, b) => COST[b] - COST[a]);
  }
  return waves;
}

/** A mini boss (a big one: the Yeti, the Spider, the Blue Demon) comes in these waves. */
export const hasYeti = (waves: readonly EnemyKind[][]) => waves.some((w) => w.some((k) => MINI_BOSSES.includes(k)));

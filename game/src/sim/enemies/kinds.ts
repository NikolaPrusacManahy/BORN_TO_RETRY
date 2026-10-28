// Update 0.0.12 — the enemy catalog (design §9): every kind's numbers in one place, read from tuning/enemies.ts. A new
// kind is a new entry here (the compiler then asks for it everywhere: its update, its model, its sounds).
// Update 0.0.13 — the Leaper, and two fliers: the Stinger and the Wraith (tuning/foes.ts). Fliers find their way on
// their own grid (only walls and columns reach up to them).
import { ENEMIES } from '../../tuning/enemies';
import { FOES } from '../../tuning/foes';

export type EnemyKind = 'grunt' | 'spitter' | 'brute' | 'leaper' | 'stinger' | 'wraith';
/** Which grid it finds its way on: the big ones need wider gaps; fliers go over low things. */
export type SizeClass = 'small' | 'large' | 'air';

export const ENEMY_KINDS: readonly EnemyKind[] = ['grunt', 'spitter', 'brute', 'leaper', 'stinger', 'wraith'];
export const SIZE_CLASSES: readonly SizeClass[] = ['small', 'large', 'air'];

export interface EnemyStats {
  hp: number;
  /** Its body's radius (m: fixed, the walk grids are built for it) and height (its hit capsule's and model's). */
  radius: number;
  height: number;
  speed: number;
  /** A hit's knock times this slides it. */
  knock: number;
  /** A hit at least this hard flinches it (0: any hit). */
  stagger: number;
  flinch: number;
  deathTime: number;
  coins: number;
  size: SizeClass;
}

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS: Record<EnemyKind, number> = { grunt: 0.45, spitter: 0.4, brute: 0.85, leaper: 0.45, stinger: 0.5, wraith: 0.55 };
/** The grid each size class walks: blocked for this radius (a little less than the brute's, so 2 m gaps stay open:
 *  the push out of walls keeps its body clear anyway). */
export const GRID_RADIUS: Record<SizeClass, number> = { small: 0.45, large: 0.65, air: 0.6 };

const blank = (size: SizeClass): EnemyStats => ({ hp: 0, radius: 0, height: 0, speed: 0, knock: 0, stagger: 0, flinch: 0, deathTime: 0, coins: 0, size });
const CACHE: Record<EnemyKind, EnemyStats> = { grunt: blank('small'), spitter: blank('small'), brute: blank('large'), leaper: blank('small'), stinger: blank('air'), wraith: blank('air') };

function fill(s: EnemyStats, hp: number, radius: number, height: number, speed: number, knock: number, stagger: number, flinch: number, deathTime: number, coins: number): EnemyStats {
  s.hp = hp;
  s.radius = radius;
  s.height = height;
  s.speed = speed;
  s.knock = knock;
  s.stagger = stagger;
  s.flinch = flinch;
  s.deathTime = deathTime;
  s.coins = coins;
  return s;
}

/** A kind's numbers as the knobs say now (one object per kind, refilled: nothing is made per call). */
export const ENEMY_STATS: Record<EnemyKind, () => EnemyStats> = {
  grunt: () => {
    const v = ENEMIES.v;
    return fill(CACHE.grunt, v.gruntHp, RADIUS.grunt, v.gruntHeight, v.gruntSpeed, v.gruntKnock, 0, v.gruntFlinch, v.gruntDeathTime, v.gruntCoins);
  },
  spitter: () => {
    const v = ENEMIES.v;
    return fill(CACHE.spitter, v.spitterHp, RADIUS.spitter, v.spitterHeight, v.spitterSpeed, v.spitterKnock, 0, v.spitterFlinch, 1.2, v.spitterCoins);
  },
  brute: () => {
    const v = ENEMIES.v;
    return fill(CACHE.brute, v.bruteHp, RADIUS.brute, v.bruteHeight, v.bruteSpeed, v.bruteKnock, v.bruteStagger, v.bruteFlinch, 2, v.bruteCoins);
  },
  leaper: () => {
    const v = FOES.v;
    return fill(CACHE.leaper, v.leaperHp, RADIUS.leaper, v.leaperHeight, v.leaperSpeed, v.leaperKnock, 0, v.leaperFlinch, 1.4, v.leaperCoins);
  },
  stinger: () => {
    const v = FOES.v;
    return fill(CACHE.stinger, v.stingerHp, RADIUS.stinger, v.stingerHeight, v.stingerSpeed, v.stingerKnock, 0, v.stingerFlinch, 1.4, v.stingerCoins);
  },
  wraith: () => {
    const v = FOES.v;
    return fill(CACHE.wraith, v.wraithHp, RADIUS.wraith, v.wraithHeight, v.wraithSpeed, v.wraithKnock, 0, v.wraithFlinch, 1.4, v.wraithCoins);
  },
};

/** Fliers (they stay up; their bodies fall when they die). */
export const flies = (kind: EnemyKind) => CACHE[kind].size === 'air';

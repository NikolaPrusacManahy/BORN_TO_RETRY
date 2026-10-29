// Update 0.0.12 — the enemy catalog (design §9): every kind's numbers in one place, read from tuning/enemies.ts. A new
// kind is a new entry here (the compiler then asks for it everywhere: its update, its model, its sounds).
// Update 0.0.13 — the Leaper, and two fliers: the Stinger and the Wraith (tuning/foes.ts). Fliers find their way on
// their own grid (only walls and columns reach up to them).
// Update 0.0.15 — the Demon, the first boss (tuning/boss.ts): big, never flinches, takes more while stunned.
// Update 0.0.18 — floor 2's enemies (tuning/foes2.ts): the Slime, the Frog, the Snake, the Wasp (a flier), and the big
// Spider and Blue Demon (only a hard hit staggers them); and floor 2's boss, the Dragon (tuning/dragon.ts).
// Update 0.1.19 — floor 3's (tuning/foes3.ts): the Skeleton (it rebuilds itself), the Mushnub, and the Ninja, a mini
// boss (only a hard hit staggers it; it teleports away from some).
import { BOSS } from '../../tuning/boss';
import { DRAGON } from '../../tuning/dragon';
import { FOES2 } from '../../tuning/foes2';
import { ENEMIES } from '../../tuning/enemies';
import { FOES } from '../../tuning/foes';
import { FOES3 } from '../../tuning/foes3';

export type EnemyKind = 'grunt' | 'spitter' | 'brute' | 'leaper' | 'stinger' | 'wraith' | 'demon' | 'slime' | 'frog' | 'snake' | 'wasp' | 'spider' | 'blueDemon' | 'dragon' | 'skeleton' | 'mushnub' | 'ninja';
/** Which grid it finds its way on: the big ones need wider gaps; fliers go over low things. */
export type SizeClass = 'small' | 'large' | 'air';

export const ENEMY_KINDS: readonly EnemyKind[] = ['grunt', 'spitter', 'brute', 'leaper', 'stinger', 'wraith', 'demon', 'slime', 'frog', 'snake', 'wasp', 'spider', 'blueDemon', 'dragon', 'skeleton', 'mushnub', 'ninja'];
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
  /** Update 0.0.15 — a boss (its death is a show: boss.ts), and what a hit on it while stunned is worth. */
  boss: boolean;
  stunned: number;
}

/** Body radii (m). Not knobs: the walk grids are built for them. */
export const RADIUS: Record<EnemyKind, number> = { grunt: 0.45, spitter: 0.4, brute: 0.85, leaper: 0.45, stinger: 0.5, wraith: 0.55, demon: 1.7, slime: 0.5, frog: 0.55, snake: 0.4, wasp: 0.5, spider: 1.3, blueDemon: 0.85, dragon: 1.8, skeleton: 0.45, mushnub: 0.45, ninja: 0.45 };
/** The grid each size class walks: blocked for this radius (a little less than the brute's, so 2 m gaps stay open:
 *  the push out of walls keeps its body clear anyway). */
export const GRID_RADIUS: Record<SizeClass, number> = { small: 0.45, large: 0.65, air: 0.6 };

const blank = (size: SizeClass, boss = false): EnemyStats => ({ hp: 0, radius: 0, height: 0, speed: 0, knock: 0, stagger: 0, flinch: 0, deathTime: 0, coins: 0, size, boss, stunned: 1 });
const CACHE: Record<EnemyKind, EnemyStats> = {
  grunt: blank('small'),
  spitter: blank('small'),
  brute: blank('large'),
  leaper: blank('small'),
  stinger: blank('air'),
  wraith: blank('air'),
  demon: blank('large', true),
  slime: blank('small'),
  frog: blank('small'),
  snake: blank('small'),
  wasp: blank('air'),
  spider: blank('large'),
  blueDemon: blank('large'),
  dragon: blank('large', true),
  skeleton: blank('small'),
  mushnub: blank('small'),
  ninja: blank('small'),
};

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
  demon: () => {
    const v = BOSS.v;
    // Never flinches, barely slides; its coins burst out when its body does (bossRoom.ts), not on the killing hit.
    const s = fill(CACHE.demon, v.demonHp, RADIUS.demon, v.demonHeight, v.demonSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = v.stunBonus;
    return s;
  },
  // Update 0.0.18 — floor 2's.
  slime: () => {
    const v = FOES2.v;
    return fill(CACHE.slime, v.slimeHp, RADIUS.slime, v.slimeHeight, v.slimeSpeed, 1.2, 0, 0.2, 1.2, v.slimeCoins);
  },
  frog: () => {
    const v = FOES2.v;
    return fill(CACHE.frog, v.frogHp, RADIUS.frog, v.frogHeight, v.frogSpeed, 0.8, 0, 0.3, 1.4, v.frogCoins);
  },
  snake: () => {
    const v = FOES2.v;
    return fill(CACHE.snake, v.snakeHp, RADIUS.snake, v.snakeHeight, v.snakeSpeed, 0.9, 0, 0.25, 1.4, v.snakeCoins);
  },
  wasp: () => {
    const v = FOES2.v;
    return fill(CACHE.wasp, v.waspHp, RADIUS.wasp, v.waspHeight, v.waspSpeed, 1, 0, 0.3, 1.4, v.waspCoins);
  },
  spider: () => {
    const v = FOES2.v;
    return fill(CACHE.spider, v.spiderHp, RADIUS.spider, v.spiderHeight, v.spiderSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.spiderCoins);
  },
  blueDemon: () => {
    const v = FOES2.v;
    const s = fill(CACHE.blueDemon, v.blueHp, RADIUS.blueDemon, v.blueHeight, v.blueSpeed, 0.3, ENEMIES.v.bruteStagger, 0.4, 2, v.blueCoins);
    s.stunned = 1.5;
    return s;
  },
  // Update 0.0.18 — floor 2's boss: like the Demon, never flinches, and takes more while stunned.
  dragon: () => {
    const v = DRAGON.v;
    const s = fill(CACHE.dragon, v.dragonHp, RADIUS.dragon, v.dragonHeight, v.dragonSpeed, 0.05, Infinity, 0, doomTime() + DOOM_AFTER, 0);
    s.stunned = BOSS.v.stunBonus;
    return s;
  },
  // Update 0.1.19 — floor 3's. The Ninja: only a hard hit staggers it (as a Yeti's).
  skeleton: () => {
    const v = FOES3.v;
    return fill(CACHE.skeleton, v.skeletonHp, RADIUS.skeleton, v.skeletonHeight, v.skeletonSpeed, 0.8, 0, 0.25, 1.4, v.skeletonCoins);
  },
  mushnub: () => {
    const v = FOES3.v;
    return fill(CACHE.mushnub, v.mushnubHp, RADIUS.mushnub, v.mushnubHeight, v.mushnubSpeed, 1, 0, 0.25, 1.2, v.mushnubCoins);
  },
  ninja: () => {
    const v = FOES3.v;
    return fill(CACHE.ninja, v.ninjaHp, RADIUS.ninja, v.ninjaHeight, v.ninjaSpeed, 0.4, ENEMIES.v.bruteStagger, 0.35, 1.6, v.ninjaCoins);
  },
};

/** Update 0.0.18 — each floor's boss (floor 3 has floor 2's for now). */
export const bossOf = (floor: number): EnemyKind => (floor <= 1 ? 'demon' : 'dragon');

/** Update 0.0.18 — the mini bosses (the designer): a room with one has a chest, and the first killed drops its key. */
export const MINI_BOSSES: readonly EnemyKind[] = ['brute', 'spider', 'blueDemon', 'ninja'];

/** Update 0.0.15 — a boss's death show: up, hanging, sinking (s); its body bursts at the end, and its slot frees this
 *  long after. */
export const doomTime = () => BOSS.v.doomRise + BOSS.v.doomHang + BOSS.v.doomDrop;
export const DOOM_AFTER = 0.1;

/** Fliers (they stay up; their bodies fall when they die). */
export const flies = (kind: EnemyKind) => CACHE[kind].size === 'air';

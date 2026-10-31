// Update 0.2.10 — what every enemy kind's numbers are (out of kinds.ts, which had reached its size): its stats, the
// grid it walks, a blank set of them to refill, the refill, and a boss's death show's length. Pure.
import { BOSS } from '../../tuning/boss';

/** Which grid it finds its way on: the big ones need wider gaps; fliers go over low things. */
export type SizeClass = 'small' | 'large' | 'air';

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

export const blank = (size: SizeClass, boss = false): EnemyStats => ({ hp: 0, radius: 0, height: 0, speed: 0, knock: 0, stagger: 0, flinch: 0, deathTime: 0, coins: 0, size, boss, stunned: 1 });

export function fill(s: EnemyStats, hp: number, radius: number, height: number, speed: number, knock: number, stagger: number, flinch: number, deathTime: number, coins: number): EnemyStats {
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

/** Update 0.0.15 — a boss's death show: up, hanging, sinking (s); its body bursts at the end, and its slot frees this
 *  long after. */
export const doomTime = () => BOSS.v.doomRise + BOSS.v.doomHang + BOSS.v.doomDrop;
export const DOOM_AFTER = 0.1;

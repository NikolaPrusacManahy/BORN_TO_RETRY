// Update 0.1.19 — the Skeleton (floor 3; the designer: "they revive as they rebuilt from pieces to body"). It fights as
// a Grunt does (brawler.ts: a sword swing). Brought down, it falls to pieces (enemy.ts hitEnemy: not a kill yet, no
// coins), lies a while, then rebuilds itself and stands, whole again, as many times as Skeleton revives. Hit the bones
// while they lie or rise and it stays down; one executed stays down too. Pure.
import { FOES3 } from '../../tuning/foes3';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, setPhase } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const SKELETON: Brawl = {
  reach: () => FOES3.v.skeletonReach,
  windup: () => FOES3.v.skeletonWindup,
  damage: () => FOES3.v.skeletonDamage,
  turn: 8,
  windupTurn: 2.5,
  arc: 70,
  recover: 0.55,
  shove: 6,
  windupEvent: 'skeletonWindup',
  strikeEvent: 'skeletonStrike',
};

/** Its pieces' time (`e.shots`): just fallen, lying, rising. */
const FALLEN = 0;
export const LYING = 1;
const RISING = 2;

export function updateSkeleton(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  if (s.phase !== 'rebuild') return brawl(s, index, player, w, dt, SKELETON, armed(s));
  const v = FOES3.v;
  if (s.shots === FALLEN) {
    s.shots = LYING;
    w.events.push('skeletonCollapse', index, s.pos.x, s.pos.y + 0.4, s.pos.z);
  }
  if (s.shots === LYING && s.t >= v.skeletonDown) {
    s.shots = RISING;
    w.events.push('skeletonRise', index, s.pos.x, s.pos.y + 0.4, s.pos.z);
  }
  if (s.t >= v.skeletonDown + v.skeletonRise) {
    // Whole again: one revive used.
    s.stage++;
    s.hp = ENEMY_STATS.skeleton().hp;
    s.shots = 0;
    setPhase(s, 'chase');
  }
}


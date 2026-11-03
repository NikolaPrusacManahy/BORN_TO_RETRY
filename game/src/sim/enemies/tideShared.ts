// Update 0.3.29 — what Tidebreaker's moves share (tidebreaker.ts, tideMoves.ts, tideWreck.ts): its moves' numbers, its
// pace (raging, frenzied), its warning, how far round you are from where it faces, the pillars its world has. Pure.
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { pillarsIn, PillarWorld } from '../combat/pillars';
import { Enemy, EnemyWorld, setPhase, yawTo } from './enemy';

/** Its moves (`move`). */
export const SMASH = 0;
export const COMBO = 1;
export const COMBO_C = 2;
export const COMBO_D = 3;
export const UPPERCUT = 4;
export const LEAP = 5;
export const THROW = 6;
export const HURL = 7;
export const ROLL = 8;
export const PILLAR = 9;
export const SWING = 10;
export const QUAKE = 11;
export const ROAR = 12;
/** A ring's speed (m/s); higher than this over its feet you're over its blows (m). */
export const RING_SPEED = 17;
export const OVER = 3.2;

export const paceOf = (d: Enemy) => (d.stage >= 2 ? TIDEBREAKER.v.frenzyPace : d.stage === 1 ? TIDEBREAKER.v.ragePace : 1);

/** The world's pillars and what breaking them needs (none outside a fight's state). */
export const wrecks = (w: EnemyWorld): PillarWorld | null => (pillarsIn(w).length ? (w as unknown as PillarWorld) : null);

/** How far round from where it faces (x, z) is (rad). */
export function offAngle(d: Enemy, x: number, z: number): number {
  const a = yawTo(d, x, z) - d.facing;
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
}

/** `move` warned. */
export function warn(d: Enemy, move: number, w: EnemyWorld) {
  d.move = move;
  setPhase(d, 'windup');
  w.events.push('tideWindup', move, d.pos.x, d.pos.y + TIDEBREAKER.v.tideHeight * 0.75, d.pos.z);
}

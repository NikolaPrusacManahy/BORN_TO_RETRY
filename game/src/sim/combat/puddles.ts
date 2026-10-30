// Update 0.2.4 — the Lizard's poison puddles (floor 4): its glob (a bomb with a poison look: bombs.ts) lands and leaves
// a puddle on the floor for Poison puddle time; standing in one (on the floor), you're poisoned (Poison damage a second,
// lasting Poison time after you step out). A small pool, no garbage. Pure.
import type { EventQueue } from '../../core/eventQueue';
import { FOES4 } from '../../tuning/foes4';
import { poisonPlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatEvent } from './state';

export interface Puddle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  r: number;
  /** Seconds left, and how long it lasts in all (the view fades it). */
  life: number;
  full: number;
}

export const PUDDLE_POOL = 10;

export function createPuddles(): Puddle[] {
  return Array.from({ length: PUDDLE_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, r: 1, life: 0, full: 1 }));
}

/** A puddle at (x, y, z) (the oldest goes if they're all in use). */
export function addPuddle(puddles: Puddle[], x: number, y: number, z: number, events: EventQueue<CombatEvent>) {
  const v = FOES4.v;
  let p = puddles.find((q) => !q.alive);
  if (!p) p = puddles.reduce((a, b) => (b.life < a.life ? b : a));
  p.alive = true;
  p.x = x;
  p.y = y;
  p.z = z;
  p.r = v.puddleRadius;
  p.life = p.full = v.puddleTime;
  events.push('poisonSplash', 0, x, y, z);
}

/** They dry up; you, standing in one, are poisoned. */
export function updatePuddles(puddles: Puddle[], player: PlayerState, dt: number) {
  const v = FOES4.v;
  for (const p of puddles) {
    if (!p.alive) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.alive = false;
      continue;
    }
    if (player.dead || Math.abs(player.pos.y - p.y) > 0.4 || Math.hypot(player.pos.x - p.x, player.pos.z - p.z) > p.r) continue;
    poisonPlayer(player, v.puddleDps, v.puddlePoison, 'lizard');
  }
}

export function clearPuddles(puddles: Puddle[]) {
  for (const p of puddles) p.alive = false;
}

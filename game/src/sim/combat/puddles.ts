// Update 0.2.4 — the Lizard's poison puddles (floor 4): its glob (a bomb with a poison look: bombs.ts) lands and leaves
// a puddle on the floor for Poison puddle time; standing in one (on the floor), you're poisoned (Poison damage a second,
// lasting Poison time after you step out). A small pool, no garbage. Pure.
// Update 0.3.49 — the Dragon's burning pools (its Ember Rain, the Boss Design Bible): the same pool, `fire`: standing in one
// burns you (your hurt invincibility spaces it), and it shrinks the safe floor till it fades.
import type { EventQueue } from '../../core/eventQueue';
import { DRAGON } from '../../tuning/dragon';
import { FOES4 } from '../../tuning/foes4';
import { damagePlayer, poisonPlayer } from '../player/health';
import type { Cause, PlayerState } from '../player/state';
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
  /** Update 0.3.49 — burning, not poison. */
  fire: boolean;
  /** Update 0.3.51 — whose poison (the death screen names it). */
  by: Cause;
}

export const PUDDLE_POOL = 10;

export function createPuddles(): Puddle[] {
  return Array.from({ length: PUDDLE_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, r: 1, life: 0, full: 1, fire: false, by: 'lizard' as Cause }));
}

/** A free slot (the oldest goes if they're all in use); none in an empty pool. */
function slot(puddles: Puddle[]): Puddle | null {
  if (puddles.length === 0) return null;
  return puddles.find((q) => !q.alive) ?? puddles.reduce((a, b) => (b.life < a.life ? b : a));
}

/** A puddle at (x, y, z). */
export function addPuddle(puddles: Puddle[], x: number, y: number, z: number, events: EventQueue<CombatEvent>, by: Cause = 'lizard') {
  const v = FOES4.v;
  const p = slot(puddles);
  if (p) {
    place(p, x, y, z, v.puddleRadius, v.puddleTime, false);
    p.by = by;
  }
  events.push('poisonSplash', 0, x, y, z);
}

/** Update 0.3.49 — a burning pool at (x, y, z). */
export function addFirePool(puddles: Puddle[], x: number, y: number, z: number) {
  const v = DRAGON.v;
  const p = slot(puddles);
  if (p) place(p, x, y, z, v.poolRadius, v.poolTime, true);
}

function place(p: Puddle, x: number, y: number, z: number, r: number, life: number, fire: boolean) {
  p.alive = true;
  p.x = x;
  p.y = y;
  p.z = z;
  p.r = r;
  p.life = p.full = life;
  p.fire = fire;
}

/** They dry up; you, standing in one, are poisoned or burnt. */
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
    if (p.fire) damagePlayer(player, DRAGON.v.poolDamage, 'dragon');
    else poisonPlayer(player, v.puddleDps, v.puddlePoison, p.by);
  }
}

export function clearPuddles(puddles: Puddle[]) {
  for (const p of puddles) p.alive = false;
}

// Update 0.0.15 — quake rings: the Demon's landing sends a ring rolling out over the floor. Standing on the floor as
// its front rolls under you, you're hurt and popped up; feet more than Quake clearance up (a jump) and it passes under
// you. One hit per ring. A small pool, no garbage. Pure.
import type { EventQueue } from '../../core/eventQueue';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatEvent } from './state';

export interface Quake {
  alive: boolean;
  /** Its middle and the floor it rolls on (m); how far out its front is. */
  x: number;
  y: number;
  z: number;
  r: number;
  speed: number;
  reach: number;
  damage: number;
  clear: number;
  /** It has hurt you (once per ring). */
  hit: boolean;
}

export const QUAKE_POOL = 4;
/** A quake pops you up this fast (m/s). */
const POP = 7;

export function createQuakes(): Quake[] {
  return Array.from({ length: QUAKE_POOL }, () => ({ alive: false, x: 0, y: 0, z: 0, r: 0, speed: 0, reach: 0, damage: 0, clear: 0, hit: false }));
}

/** A ring from (x, y, z) out to `reach`. Reuses the oldest when every slot is in use. */
export function startQuake(quakes: Quake[], x: number, y: number, z: number, speed: number, reach: number, damage: number, clear: number) {
  let q = quakes[0];
  for (const c of quakes) {
    if (!c.alive) {
      q = c;
      break;
    }
    if (c.r > q.r) q = c;
  }
  q.alive = true;
  q.x = x;
  q.y = y;
  q.z = z;
  q.r = 0;
  q.speed = speed;
  q.reach = reach;
  q.damage = damage;
  q.clear = clear;
  q.hit = false;
}

export function updateQuakes(quakes: Quake[], player: PlayerState, events: EventQueue<CombatEvent>, dt: number) {
  for (const q of quakes) {
    if (!q.alive) continue;
    const from = q.r;
    q.r = Math.min(q.reach, q.r + q.speed * dt);
    if (!q.hit && !player.dead) {
      const d = Math.hypot(player.pos.x - q.x, player.pos.z - q.z);
      // The front passed under you this tick (your body's width counts), with your feet on the floor.
      if (d >= from - BODY.radius && d <= q.r + BODY.radius && player.pos.y - q.y <= q.clear && damagePlayer(player, q.damage)) {
        q.hit = true;
        player.vel.y = Math.max(player.vel.y, POP);
        player.grounded = false;
        events.push('quakeHit', q.damage, player.pos.x, player.pos.y, player.pos.z);
      }
    }
    if (q.r >= q.reach) q.alive = false;
  }
}

export function clearQuakes(quakes: Quake[]) {
  for (const q of quakes) q.alive = false;
}

// The start of every enemy's tick: timers, its body's time, out of walls, its fall and its knock. (Update 0.3.7 — moved
// here from enemy.ts, which had grown too long; the knock flies now: flight.ts. A body lying there flies on with the
// blow that killed it too, not a boss's, whose death show places it, nor one on a ledge.) Pure.
import type { NavGrid } from '../../world/navGrid';
import { pushOutOfWalls } from '../../world/navGrid';
import { Enemy, grounded, radiusOf } from './enemy';
import { fly } from './flight';
import { ENEMY_STATS, flies } from './kinds';

/** A falling body's gravity (m/s²). */
const FALL = 25;

/** Returns false if it has nothing more to do this tick (a body lying there, or a free slot). Update 0.3.17 —
 *  `gravity`: its share of the usual (the moon's). (Update 0.3.11's `slick`, its knock sliding far on ice, went in
 *  0.3.27.) */
export function beginTick(e: Enemy, nav: NavGrid, dt: number, gravity = 1): boolean {
  if (!e.alive) return false;
  e.prev.copy(e.pos);
  // Frozen: nothing moves on (not even its time, so an attack waits), until the ice wears off.
  if (e.frozen > 0 && e.phase !== 'dead') {
    e.frozen = Math.max(0, e.frozen - dt);
    e.flash = Math.max(0, e.flash - dt);
    return false;
  }
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.cooldown = Math.max(0, e.cooldown - dt);
  if (e.phase === 'dead') {
    // (Update 0.3.8 — pinned to a wall: it hangs there, then drops, its death from then.)
    if (e.pinned > 0) {
      e.pinned = Math.max(0, e.pinned - dt);
      if (e.pinned === 0) e.t = 0;
      return false;
    }
    // A body in the air falls (a boss's is placed by its death show).
    if (e.pos.y > e.perch && !ENEMY_STATS[e.kind]().boss) {
      e.vel.y -= FALL * gravity * dt;
      e.pos.y = Math.max(e.perch, e.pos.y + e.vel.y * dt);
    }
    if (e.perch <= 0 && !ENEMY_STATS[e.kind]().boss) fly(e, nav, radiusOf(e), dt);
    if (e.t >= ENEMY_STATS[e.kind]().deathTime) e.alive = false;
    return false;
  }
  // A walker in the air with no leap to carry it (knocked out of one) falls.
  // (Update 0.3.49 — the Dragon holds its own height, all through its moves in the sky.)
  if (!flies(e.kind) && e.kind !== 'dragon' && e.phase !== 'leap' && e.phase !== 'sky' && e.phase !== 'held' && e.pos.y > e.perch) {
    e.vel.y -= FALL * gravity * dt;
    e.pos.y = Math.max(e.perch, e.pos.y + e.vel.y * dt);
    if (e.pos.y === e.perch) e.vel.y = 0;
  }
  // Perched: hits don't slide it off its ledge.
  if (e.perch > 0) e.vel.set(0, 0, 0);
  if (grounded(e)) pushOutOfWalls(nav, e.pos, radiusOf(e));
  fly(e, nav, radiusOf(e), dt);
  return true;
}

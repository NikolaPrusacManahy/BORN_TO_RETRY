// Update 0.1.15 (out of enemy.ts, which had reached its size; no change in behaviour) — bodies: live enemies push each
// other apart (never standing inside one another, never pushed into a wall), and the player can't walk through one.
// Update 0.1.19 — a Skeleton's bones on the floor don't block anyone.
// Pure.
import { Vector3 } from 'three';
import type { NavGrid } from '../../world/navGrid';
import { pushOutOfWalls } from '../../world/navGrid';
import type { CollisionWorld, MoveResult } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import { Enemy, grounded, isLive, radiusOf } from './enemy';
import { ENEMY_STATS, SizeClass } from './kinds';

/** Bodies further apart in height than this (m) don't push each other. */
const LEVELS_APART = 1.5;

/** Live enemies push each other apart (they never stand inside one another), and none is pushed into a wall. */
export function separateEnemies(enemies: Enemy[], nav: Record<SizeClass, NavGrid>) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (!isLive(a) || a.phase === 'held' || a.phase === 'rebuild') continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (!isLive(b) || b.phase === 'held' || b.phase === 'rebuild' || Math.abs(a.pos.y - b.pos.y) > LEVELS_APART) continue;
      const min = radiusOf(a) + radiusOf(b);
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      // The heavier gives way less.
      const wa = radiusOf(b) / min;
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      a.pos.x -= nx * (min - d) * wa;
      a.pos.z -= nz * (min - d) * wa;
      b.pos.x += nx * (min - d) * (1 - wa);
      b.pos.z += nz * (min - d) * (1 - wa);
    }
  }
  for (const e of enemies) if (isLive(e) && grounded(e)) pushOutOfWalls(nav[ENEMY_STATS[e.kind]().size], e.pos, radiusOf(e));
}

const shove = new Vector3();
/** Passes over the enemies when pushing the player out (squeezed between two, one push can land in the other). */
const KING_ON = 0.8;
const PUSH_PASSES = 3;

/** The player can't walk through an enemy: pushed out of any it overlaps, through the collision world (so never into
 *  a wall). */
export function pushPlayerOut(player: PlayerState, enemies: Enemy[], world: CollisionWorld, radius: number, out: MoveResult) {
  for (let pass = 0; pass < PUSH_PASSES; pass++) {
    for (const e of enemies) {
      if (!isLive(e) || e.phase === 'held' || e.phase === 'rebuild') continue;
      // (Update 0.3.53 — up on the Bone King's arm or its back, you're on it; its bones flown, there's nothing there.)
      if (e.king && (player.pos.y - e.pos.y > KING_ON || e.phase === 'leap')) continue;
      const min = radiusOf(e) + radius;
      const dx = player.pos.x - e.pos.x;
      const dz = player.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= min || player.pos.y > e.pos.y + ENEMY_STATS[e.kind]().height || player.pos.y + 1 < e.pos.y) continue;
      const nx = d > 1e-4 ? dx / d : 1;
      const nz = d > 1e-4 ? dz / d : 0;
      shove.set(nx * (min - d), 0, nz * (min - d));
      world.movePlayer(player.pos, shove, player.kneel > 0, out);
    }
  }
}

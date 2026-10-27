// Update 0.0.12 — one tick of every enemy: the way to the player for each size (only redone when the player moves to
// another cell), each enemy's shared start (timers, its body's time, the knockback slide), then its kind's own moves,
// then all of them pushed apart. The order is fixed so the same inputs give the same fight.
import type { PlayerState } from '../player/state';
import { updateFlow } from './chase';
import { beginTick, Enemy, EnemyWorld, isLive, separateEnemies } from './enemy';
import { updateBrute } from './brute';
import { updateGrunt } from './grunt';
import { ENEMY_STATS, EnemyKind } from './kinds';
import { updateSpitter } from './spitter';

type Update = (e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) => void;

const UPDATE: Record<EnemyKind, Update> = { grunt: updateGrunt, spitter: updateSpitter, brute: updateBrute };

export function updateEnemies(enemies: Enemy[], player: PlayerState, w: EnemyWorld, dt: number) {
  let any = false;
  let large = false;
  for (const e of enemies) {
    any ||= e.alive;
    large ||= isLive(e) && ENEMY_STATS[e.kind]().size === 'large';
  }
  if (!any) return;
  updateFlow(w.flow.small, w.nav.small, player.pos.x, player.pos.z);
  if (large) updateFlow(w.flow.large, w.nav.large, player.pos.x, player.pos.z);
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (beginTick(e, w.nav[ENEMY_STATS[e.kind]().size], dt)) UPDATE[e.kind](e, i, player, w, dt);
  }
  separateEnemies(enemies, w.nav);
}

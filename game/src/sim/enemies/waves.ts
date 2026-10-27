// M2 — the Feel Lab's grunts: a few at a time; once the last one dies, the next wave comes after a short delay at
// spawn points away from the player. Spawns are picked with the seeded RNG (never Math.random in sim/).
import { Vector3 } from 'three';
import type { Rng } from '../../core/rng';
import type { EventQueue } from '../../core/eventQueue';
import { ENEMIES } from '../../tuning/enemies';
import type { Spot } from '../../world/arena';
import type { CombatEvent } from '../combat/state';
import type { PlayerState } from '../player/state';
import { Grunt, isLive, spawnGrunt } from './grunt';

/** A wave never spawns closer to the player than this (m). */
export const SPAWN_MIN_DIST = 10;

export interface Waves {
  /** Seconds until the next wave (counting only while no grunt is fighting). */
  timer: number;
}

export function createWaves(): Waves {
  return { timer: ENEMIES.v.labWaveDelay };
}

const at = new Vector3();

export function updateWaves(w: Waves, grunts: Grunt[], spots: readonly Spot[], player: PlayerState, rng: Rng, events: EventQueue<CombatEvent>, dt: number) {
  const count = ENEMIES.v.labGrunts;
  if (count <= 0 || spots.length === 0 || grunts.some(isLive)) return;
  w.timer -= dt;
  if (w.timer > 0) return;
  w.timer = ENEMIES.v.labWaveDelay;
  const far = spots.filter((s) => Math.hypot(s.x - player.pos.x, s.z - player.pos.z) >= SPAWN_MIN_DIST);
  const pool = far.length > 0 ? far : [...spots];
  for (let n = 0; n < count && pool.length > 0; n++) {
    const s = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    at.set(s.x, s.y, s.z);
    const i = spawnGrunt(grunts, at, Math.atan2(-(player.pos.x - s.x), -(player.pos.z - s.z)));
    if (i >= 0) events.push('gruntSpawn', i, s.x, s.y, s.z);
  }
}

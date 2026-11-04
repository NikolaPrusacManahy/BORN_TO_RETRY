// M2 — the Feel Lab's waves: a few enemies at a time; once the last one dies, the next wave comes after a short delay
// at spawn points away from the player. Spawns are picked with the seeded RNG (never Math.random in sim/).
// Update 0.0.12 — a wave mixes grunts, spitters and brutes (Lab grunts, Lab spitters, Lab brutes).
// Update 0.0.13 — and leapers, stingers and wraiths (Lab leapers, Lab stingers, Lab wraiths).
// Update 0.0.15 — and the Demon (Lab demon), to try the boss fight.
import { Vector3 } from 'three';
import type { Rng } from '../../core/rng';
import type { EventQueue } from '../../core/eventQueue';
import { DRAGON } from '../../tuning/dragon';
import { ENEMIES } from '../../tuning/enemies';
import { FOES } from '../../tuning/foes';
import { FOES2 } from '../../tuning/foes2';
import type { Spot } from '../../world/arena';
import type { CombatEvent } from '../combat/state';
import type { PlayerState } from '../player/state';
import { Enemy, isLive, spawnEnemy } from './enemy';
import type { EnemyKind } from './kinds';

/** A wave never spawns closer to the player than this (m). */
export const SPAWN_MIN_DIST = 10;

export interface Waves {
  /** Seconds until the next wave (counting only while nothing is fighting). */
  timer: number;
}

export function createWaves(): Waves {
  return { timer: ENEMIES.v.labWaveDelay };
}

const at = new Vector3();

/** Puts `kind` at a spot picked (seeded) from `pool`, which loses it. Returns its index, or −1. */
export function spawnAt(enemies: Enemy[], kind: EnemyKind, pool: Spot[], player: PlayerState, rng: Rng, events: EventQueue<CombatEvent>): number {
  if (pool.length === 0) return -1;
  const s = pool.splice(Math.floor(rng() * pool.length), 1)[0];
  at.set(s.x, s.y, s.z);
  const i = spawnEnemy(enemies, kind, at, Math.atan2(-(player.pos.x - s.x), -(player.pos.z - s.z)));
  if (i >= 0) events.push('enemySpawn', i, s.x, s.y, s.z);
  return i;
}

export function updateWaves(w: Waves, enemies: Enemy[], spots: readonly Spot[], player: PlayerState, rng: Rng, events: EventQueue<CombatEvent>, dt: number) {
  const v = ENEMIES.v;
  const f = FOES.v;
  const dragons = DRAGON.v.labDragons;
  // Update 0.0.18 — floor 2's, in the lab too.
  const g = FOES2.v;
  const floor2 = g.labSlimes + g.labFrogs + g.labSnakes + g.labWasps + g.labSpiders + g.labBlueDemons;
  if (v.labGrunts + v.labSpitters + v.labBrutes + f.labLeapers + f.labStingers + f.labWraiths + dragons + floor2 <= 0 || spots.length === 0) return;
  for (const e of enemies) if (isLive(e)) return;
  w.timer -= dt;
  if (w.timer > 0) return;
  w.timer = v.labWaveDelay;
  const far = spots.filter((s) => Math.hypot(s.x - player.pos.x, s.z - player.pos.z) >= SPAWN_MIN_DIST);
  const pool = far.length > 0 ? far : [...spots];
  for (let n = 0; n < dragons; n++) spawnAt(enemies, 'dragon', pool, player, rng, events);
  for (let n = 0; n < g.labSpiders; n++) spawnAt(enemies, 'spider', pool, player, rng, events);
  for (let n = 0; n < g.labBlueDemons; n++) spawnAt(enemies, 'blueDemon', pool, player, rng, events);
  for (let n = 0; n < g.labWasps; n++) spawnAt(enemies, 'wasp', pool, player, rng, events);
  for (let n = 0; n < g.labFrogs; n++) spawnAt(enemies, 'frog', pool, player, rng, events);
  for (let n = 0; n < g.labSnakes; n++) spawnAt(enemies, 'snake', pool, player, rng, events);
  for (let n = 0; n < g.labSlimes; n++) spawnAt(enemies, 'slime', pool, player, rng, events);
  for (let n = 0; n < v.labBrutes; n++) spawnAt(enemies, 'brute', pool, player, rng, events);
  for (let n = 0; n < f.labWraiths; n++) spawnAt(enemies, 'wraith', pool, player, rng, events);
  for (let n = 0; n < f.labStingers; n++) spawnAt(enemies, 'stinger', pool, player, rng, events);
  for (let n = 0; n < f.labLeapers; n++) spawnAt(enemies, 'leaper', pool, player, rng, events);
  for (let n = 0; n < v.labSpitters; n++) spawnAt(enemies, 'spitter', pool, player, rng, events);
  for (let n = 0; n < v.labGrunts; n++) spawnAt(enemies, 'grunt', pool, player, rng, events);
}
